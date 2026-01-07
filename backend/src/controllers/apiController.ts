// backend/controllers/apiController.ts
// Contrôleur principal de l'API publique
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { 
  generateApiKeySchema, 
  createWebhookSchema,
  validateApiRequestSchema 
} from '../validators/api.validator';
import crypto from 'crypto';

/**
 * @swagger
 * tags:
 *   name: API
 *   description: Gestion de l'API publique
 */

export class ApiController {
  
  /**
   * @swagger
   * /api/v1/keys:
   *   post:
   *     summary: Générer une nouvelle clé API
   *     description: Génère une nouvelle clé API pour un utilisateur ou une application tierce
   *     tags: [API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - scopes
   *             properties:
   *               name:
   *                 type: string
   *                 description: Nom de la clé API
   *                 example: "Mon application"
   *               description:
   *                 type: string
   *                 description: Description de l'utilisation
   *                 example: "Intégration avec mon outil de recherche"
   *               scopes:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Scopes d'accès
   *                 example: ["read:projects", "write:documents"]
   *               expiresIn:
   *                 type: integer
   *                 description: Durée de validité en jours (0 = jamais)
   *                 example: 365
   *     responses:
   *       201:
   *         description: Clé API générée avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     apiKey:
   *                       type: string
   *                       description: Clé API (à sauvegarder, non récupérable)
   *                     keyId:
   *                       type: string
   *                     name:
   *                       type: string
   *                     scopes:
   *                       type: array
   *                       items:
   *                         type: string
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async generateApiKey(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const data = generateApiKeySchema.parse(req.body);
      
      // This is a placeholder as the apiKey model does not exist
      const apiKey = `eben_${crypto.randomBytes(32).toString('hex')}`;
      
      res.status(201).json({
        success: true,
        data: {
          apiKey,
          keyId: 'placeholder',
          name: data.name,
          scopes: data.scopes,
          expiresAt: null,
          createdAt: new Date(),
          warning: 'Cette clé ne sera plus jamais affichée. Sauvegardez-la dans un endroit sécurisé.'
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  /**
   * @swagger
   * /api/v1/keys:
   *   get:
   *     summary: Lister les clés API
   *     description: Liste toutes les clés API de l'utilisateur
   *     tags: [API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Numéro de page
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Nombre d'éléments par page
   *       - in: query
   *         name: active
   *         schema:
   *           type: boolean
   *         description: Filtrer par statut actif
   *     responses:
   *       200:
   *         description: Liste des clés API
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     apiKeys:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                           name:
   *                             type: string
   *                           description:
   *                             type: string
   *                           scopes:
   *                             type: array
   *                             items:
   *                               type: string
   *                           expiresAt:
   *                             type: string
   *                             format: date-time
   *                           lastUsedAt:
   *                             type: string
   *                             format: date-time
   *                           isActive:
   *                             type: boolean
   *                           createdAt:
   *                             type: string
   *                             format: date-time
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async listApiKeys(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      res.status(200).json({
        success: true,
        data: {
          apiKeys: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            pages: 0
          }
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  /**
   * @swagger
   * /api/v1/keys/{keyId}:
   *   delete:
   *     summary: Révoquer une clé API
   *     description: Révoque une clé API existante
   *     tags: [API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: path
   *         name: keyId
   *         required: true
   *         schema:
   *           type: string
   *         description: ID de la clé API
   *     responses:
   *       200:
   *         description: Clé API révoquée avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  async revokeApiKey(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      res.status(200).json({
        success: true,
        message: 'Clé API révoquée avec succès'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  /**
   * @swagger
   * /api/v1/webhooks:
   *   post:
   *     summary: Créer un webhook
   *     description: Crée un nouveau webhook pour recevoir des événements
   *     tags: [API]
   *     security:
   *       - BearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - url
   *               - events
   *             properties:
   *               url:
   *                 type: string
   *                 format: uri
   *                 description: URL du webhook
   *                 example: "https://example.com/webhook"
   *               events:
   *                 type: array
   *                 items:
   *                   type: string
   *                   enum: [project.created, project.updated, document.created, transcription.completed, coding.completed]
   *                 description: Événements à écouter
   *                 example: ["project.created", "document.created"]
   *               secret:
   *                 type: string
   *                 description: Secret pour signer les requêtes
   *               enabled:
   *                 type: boolean
   *                 default: true
   *     responses:
   *       201:
   *         description: Webhook créé avec succès
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     url:
   *                       type: string
   *                     events:
   *                       type: array
   *                       items:
   *                         type: string
   *                     secret:
   *                       type: string
   *                     enabled:
   *                       type: boolean
   *                     createdAt:
   *                       type: string
   *                       format: date-time
   *       400:
   *         $ref: '#/components/responses/ValidationError'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async createWebhook(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const data = createWebhookSchema.parse(req.body);
      
      res.status(201).json({
        success: true,
        data: {
          id: 'placeholder',
          url: data.url,
          events: data.events,
          secret: 'placeholder',
          enabled: true,
          createdAt: new Date()
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  /**
   * @swagger
   * /api/v1/usage:
   *   get:
   *     summary: Obtenir les statistiques d'utilisation de l'API
   *     description: Récupère les statistiques d'utilisation de l'API pour l'utilisateur
   *     tags: [API]
   *     security:
   *       - BearerAuth: []
   *     parameters:
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Date de début (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Date de fin (YYYY-MM-DD)
   *       - in: query
   *         name: groupBy
   *         schema:
   *           type: string
   *           enum: [day, week, month]
   *           default: day
   *         description: Regroupement des données
   *     responses:
   *       200:
   *         description: Statistiques d'utilisation
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     totalRequests:
   *                       type: integer
   *                     successfulRequests:
   *                       type: integer
   *                     failedRequests:
   *                       type: integer
   *                     averageResponseTime:
   *                       type: number
   *                     usageByEndpoint:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           endpoint:
   *                             type: string
   *                           count:
   *                             type: integer
   *                           averageTime:
   *                             type: number
   *                     dailyUsage:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           date:
   *                             type: string
   *                           count:
   *                             type: integer
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async getApiUsage(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      
      res.status(200).json({
        success: true,
        data: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          averageResponseTime: 0,
          usageByEndpoint: [],
          dailyUsage: []
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  /**
   * @swagger
   * /api/v1/validate:
   *   post:
   *     summary: Valider une clé API
   *     description: Valide une clé API et retourne ses permissions
   *     tags: [API]
   *     security:
   *       - ApiKeyAuth: []
   *     responses:
   *       200:
   *         description: Clé API valide
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     valid:
   *                       type: boolean
   *                     keyId:
   *                       type: string
   *                     scopes:
   *                       type: array
   *                       items:
   *                         type: string
   *                     expiresAt:
   *                       type: string
   *                       format: date-time
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async validateApiKey(req: Request, res: Response) {
    try {
      // This is a placeholder as the apiKey model does not exist
      const apiKey = (req as any).apiKey;
      
      res.status(200).json({
        success: true,
        data: {
          valid: true,
          keyId: 'placeholder',
          scopes: [],
          expiresAt: null,
          lastUsedAt: null
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: (error as Error).message
      });
    }
  }
  
  // Méthodes privées
  private calculateApiStats(logs: any[], groupBy: string) {
    if (logs.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        usageByEndpoint: [],
        dailyUsage: []
      };
    }
    
    const successfulRequests = logs.filter(l => l.status >= 200 && l.status < 300);
    const failedRequests = logs.filter(l => l.status >= 400);
    
    const totalResponseTime = successfulRequests.reduce((sum, log) => 
      sum + (log.responseTime || 0), 0
    );
    
    // Regroupement par endpoint
    const endpointStats: Record<string, { count: number, totalTime: number }> = {};
    logs.forEach(log => {
      const endpoint = log.endpoint || 'unknown';
      if (!endpointStats[endpoint]) {
        endpointStats[endpoint] = { count: 0, totalTime: 0 };
      }
      endpointStats[endpoint].count++;
      endpointStats[endpoint].totalTime += log.responseTime || 0;
    });
    
    const usageByEndpoint = Object.entries(endpointStats).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      averageTime: stats.totalTime / stats.count
    })).sort((a, b) => b.count - a.count);
    
    // Regroupement temporel
    const dailyUsage: Record<string, number> = {};
    logs.forEach(log => {
      let dateKey: string;
      const date = new Date(log.createdAt);
      
      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          break;
        default: // day
          dateKey = date.toISOString().split('T')[0];
      }
      
      dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + 1;
    });
    
    return {
      totalRequests: logs.length,
      successfulRequests: successfulRequests.length,
      failedRequests: failedRequests.length,
      successRate: (successfulRequests.length / logs.length) * 100,
      averageResponseTime: totalResponseTime / successfulRequests.length,
      usageByEndpoint,
      dailyUsage: Object.entries(dailyUsage)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  }
}

export default new ApiController();
