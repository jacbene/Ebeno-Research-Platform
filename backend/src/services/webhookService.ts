// backend/services/webhookService.ts
import crypto from 'crypto';
import axios from 'axios';
import { prisma } from '../lib/prisma';

export class WebhookService {

  async getActiveWebhooks(event: string) {
    return await prisma.webhook.findMany({
      where: {
        event,
        isActive: true,
      },
    });
  }

  async createWebhookLog(webhookId: string, data: any) {
    return await prisma.webhookLog.create({
      data: {
        webhookId,
        event: data.event,
        payload: data.payload,
        // ... autres champs
      },
    });
  }
  
  async triggerWebhook(event: string, data: any) {
    try {
      // Trouver les webhooks abonnés à cet événement
      const webhooks = await prisma.webhook.findMany({
        where: {
          enabled: true,
          events: { has: event }
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
      // Signer la requête
      const signature = this.signPayload(data, webhook.secret);
      
      // Envoyer la requête
      const response = await axios.post(webhook.url, {
        event,
        data,
        timestamp: new Date().toISOString(),
        signature
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Ebeno-Signature': signature,
          'X-Ebeno-Event': event,
          'User-Agent': 'Ebeno-Webhook/1.0'
        },
        timeout: 10000 // 10 secondes timeout
      });
      
      // Journaliser le succès
      await this.logWebhook(webhook.id, event, data, {
        responseCode: response.status,
        responseBody: response.data,
        duration: Date.now() - startTime
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
      
    } catch (error) {
      // Journaliser l'erreur
      await this.logWebhook(webhook.id, event, data, {
        error: error instanceof Error ? (error as Error).message : String(error),
        responseCode: (error as any).response?.status,
        responseBody: (error as any).response?.data,
        duration: Date.now() - startTime
      });
      
      return {
        webhookId: webhook.id,
        success: false,
        error: error instanceof Error ? (error as Error).message : String(error),
        duration: Date.now() - startTime
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
  
  private async logWebhook(webhookId: string, event: string, payload: any, result: any) {
    try {
      await prisma.webhookLog.create({
        data: {
          webhookId,
          event,
          payload: JSON.stringify(payload),
          responseCode: result.responseCode,
          responseBody: result.responseBody ? JSON.stringify(result.responseBody) : null,
          error: result.error,
          duration: result.duration
        }
      });
    } catch (error) {
      console.error('Erreur de journalisation de webhook:', error);
    }
  }
  
  async verifySignature(signature: string, payload: any, secret: string): Promise<boolean> {
    const expectedSignature = this.signPayload(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

export const webhookService = new WebhookService();
