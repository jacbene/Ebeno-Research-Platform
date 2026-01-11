import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../lib/prisma';

export class WebhookService {
  async getActiveWebhooks(event: string) {
    return await prisma.webhook.findMany({
      where: {
        event,
        enabled: true,
      },
    });
  }

  async createWebhookLog(webhookId: string, data: any) {
    return await prisma.webhookLog.create({
      data: {
        webhookId,
        event: data.event,
        payload: data.payload,
        responseCode: data.responseCode || null,
        response: data.response || null,
        error: data.error || null,
        retryCount: data.retryCount || 0,
        attemptedAt: new Date(),
        completedAt: data.completedAt || null,
      },
    });
  }
  
  async triggerWebhook(event: string, data: any) {
    try {
      // Trouver les webhooks abonnés à cet événement
      const webhooks = await prisma.webhook.findMany({
        where: {
          enabled: true,
          event: event,
        }
      });
      
      // Déclencher chaque webhook
      const results = [];
      for (const webhook of webhooks) {
        const result = await this.triggerSingleWebhook(webhook, event, data);
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Erreur de déclenchement de webhook:', error);
      throw error;
    }
  }
  
  private async triggerSingleWebhook(webhook: any, event: string, data: any) {
    const startTime = Date.now();
    
    try {
      // Préparer les en-têtes
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Ebeno-Webhook/1.0'
      };
      
      // Ajouter la signature si un secret est configuré
      if (webhook.secret) {
        const signature = this.signPayload(data, webhook.secret);
        headers['X-Ebeno-Signature'] = signature;
      }
      
      // Ajouter les en-têtes personnalisés si configurés
      if (webhook.headers) {
        try {
          const customHeaders = typeof webhook.headers === 'string' 
            ? JSON.parse(webhook.headers) 
            : webhook.headers;
          Object.assign(headers, customHeaders);
        } catch (error) {
          console.error('Erreur lors du parsing des en-têtes personnalisés:', error);
        }
      }
      
      // Ajouter l'événement dans les en-têtes
      headers['X-Ebeno-Event'] = event;
      
      // Préparer le payload
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
      };
      
      // Envoyer la requête
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: webhook.timeout || 5000,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Accepter uniquement les statuts 2xx
        },
      });
      
      // Journaliser le succès
      await this.createWebhookLog(webhook.id, {
        event,
        payload,
        responseCode: response.status,
        response: response.data,
        completedAt: new Date(),
        retryCount: 0,
      });
      
      // Mettre à jour la date de dernier déclenchement
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: { lastTriggeredAt: new Date() }
      });
      
      return {
        webhookId: webhook.id,
        success: true,
        status: response.status,
        duration: Date.now() - startTime
      };
      
    } catch (error: any) {
      // Gérer les réessais si configuré
      let retryCount = 0;
      const maxRetries = webhook.retryCount || 3;
      
      // Journaliser l'erreur initiale
      const logData = {
        event,
        payload: data,
        error: error.message || String(error),
        responseCode: error.response?.status || null,
        response: error.response?.data ? JSON.stringify(error.response.data) : null,
        retryCount: 0,
      };
      
      await this.createWebhookLog(webhook.id, logData);
      
      // Réessayer si configuré
      if (maxRetries > 0) {
        for (retryCount = 1; retryCount <= maxRetries; retryCount++) {
          try {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Attente exponentielle
            
            // Répéter la même requête
            const retryResponse = await axios.post(webhook.url, {
              event,
              data,
              timestamp: new Date().toISOString(),
              signature: webhook.secret ? this.signPayload(data, webhook.secret) : null,
            }, {
              headers: {
                'Content-Type': 'application/json',
                'X-Ebeno-Signature': webhook.secret ? this.signPayload(data, webhook.secret) : undefined,
                'X-Ebeno-Event': event,
                'User-Agent': 'Ebeno-Webhook/1.0'
              },
              timeout: webhook.timeout || 5000,
            });
            
            // Journaliser le succès après réessai
            await this.createWebhookLog(webhook.id, {
              event,
              payload: data,
              responseCode: retryResponse.status,
              response: retryResponse.data,
              completedAt: new Date(),
              retryCount,
            });
            
            // Mettre à jour la date de dernier déclenchement
            await prisma.webhook.update({
              where: { id: webhook.id },
              data: { lastTriggeredAt: new Date() }
            });
            
            return {
              webhookId: webhook.id,
              success: true,
              status: retryResponse.status,
              duration: Date.now() - startTime,
              retryCount,
            };
          } catch (retryError: any) {
            // Journaliser l'échec du réessai
            await this.createWebhookLog(webhook.id, {
              event,
              payload: data,
              error: retryError.message || String(retryError),
              responseCode: retryError.response?.status || null,
              response: retryError.response?.data ? JSON.stringify(retryError.response.data) : null,
              retryCount,
            });
            
            if (retryCount === maxRetries) {
              // Désactiver le webhook si trop d'échecs
              await prisma.webhook.update({
                where: { id: webhook.id },
                data: { enabled: false }
              });
            }
          }
        }
      }
      
      return {
        webhookId: webhook.id,
        success: false,
        error: error.message || String(error),
        duration: Date.now() - startTime,
        retryCount,
      };
    }
  }
  
  private signPayload(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex');
  }
  
  async verifySignature(signature: string, payload: any, secret: string): Promise<boolean> {
    try {
      const expectedSignature = this.signPayload(payload, secret);
      
      // Utiliser une comparaison constante dans le temps pour éviter les attaques par timing
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }
      
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (error) {
      console.error('Erreur lors de la vérification de la signature:', error);
      return false;
    }
  }

  // Méthodes supplémentaires pour la gestion des webhooks
  async createWebhook(data: {
    url: string;
    event: string;
    secret?: string;
    enabled?: boolean;
    projectId?: string;
    description?: string;
    headers?: any;
    timeout?: number;
    retryCount?: number;
  }) {
    return await prisma.webhook.create({
      data: {
        url: data.url,
        event: data.event,
        secret: data.secret || null,
        enabled: data.enabled !== undefined ? data.enabled : true,
        projectId: data.projectId || null,
        description: data.description || null,
        headers: data.headers || null,
        timeout: data.timeout || 5000,
        retryCount: data.retryCount || 3,
      },
    });
  }

  async updateWebhook(
    webhookId: string,
    data: Partial<{
      url: string;
      event: string;
      secret: string;
      enabled: boolean;
      description: string;
      headers: any;
      timeout: number;
      retryCount: number;
    }>
  ) {
    return await prisma.webhook.update({
      where: { id: webhookId },
      data,
    });
  }

  async deleteWebhook(webhookId: string) {
    return await prisma.webhook.delete({
      where: { id: webhookId },
    });
  }

  async getWebhookLogs(webhookId: string, options?: {
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { limit = 50, offset = 0, startDate, endDate } = options || {};
    
    const where: any = { webhookId };
    
    if (startDate || endDate) {
      where.attemptedAt = {};
      if (startDate) where.attemptedAt.gte = startDate;
      if (endDate) where.attemptedAt.lte = endDate;
    }
    
    return await prisma.webhookLog.findMany({
      where,
      orderBy: { attemptedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

export const webhookService = new WebhookService();
