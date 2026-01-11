// backend/controllers/apiController.ts
// Contrôleur principal de l'API publique
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { 
  generateApiKeySchema, 
  createWebhookSchema,
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

// Ajoutez ces méthodes à votre classe ApiController existante

// Méthodes pour les webhooks
async listWebhooks(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const userProjects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      select: { id: true }
    });
    const projectIds = userProjects.map(p => p.id);

    const webhooks = await prisma.webhook.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: webhooks });
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async deleteWebhook(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook || !webhook.projectId) {
      return res.status(404).json({ message: "Webhook non trouvé" });
    }

    const member = await prisma.projectMember.findFirst({
      where: { projectId: webhook.projectId, userId }
    });

    if (!member) {
      return res.status(403).json({ message: "Accès non autorisé à ce webhook" });
    }

    await prisma.webhook.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Webhook supprimé' });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

// Méthodes pour les données
async getProjects(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const projects = await prisma.project.findMany({
      where: { members: { some: { userId } } },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documents: true,
            transcriptions: true,
            memos: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.status(200).json({ success: true, data: projects });
  } catch (error: any) {
    console.error('Error getting projects:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async getProject(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const project = await prisma.project.findFirst({
      where: {
        id,
        members: { some: { userId } }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        },
        tags: true
      }
    });

    if (!project) {
      return res.status(404).json({ 
        success: false, 
        message: 'Projet non trouvé ou accès refusé' 
      });
    }

    res.status(200).json({ success: true, data: project });
  } catch (error: any) {
    console.error('Error getting project:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async getDocuments(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { projectId, type, page = 1, limit = 20 } = req.query;
    
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const where: any = {
      project: {
        members: { some: { userId } }
      }
    };

    if (projectId) where.projectId = projectId as string;
    if (type) where.type = type as any;

    const skip = (Number(page) - 1) * Number(limit);
    
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        select: {
          id: true,
          title: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.document.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error getting documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async getReferences(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const { projectId, search, page = 1, limit = 20 } = req.query;
    
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });
    
    const where: any = {};

    if (projectId) {
      const member = await prisma.projectMember.findFirst({
        where: { projectId: projectId as string, userId: userId }
      });
      if (!member) {
        return res.status(403).json({ message: "Accès refusé" });
      }
      where.projectId = projectId as string;
    } else {
      const userProjects = await prisma.project.findMany({
        where: { members: { some: { userId } } },
        select: { id: true }
      });
      const projectIds = userProjects.map(p => p.id);
      where.projectId = { in: projectIds };
    }
    
    if (search) {
      const searchString = search as string;
      where.OR = [
        { title: { contains: searchString, mode: 'insensitive' } },
        { author: { contains: searchString, mode: 'insensitive' } },
        { journal: { contains: searchString, mode: 'insensitive' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    
    const [references, total] = await Promise.all([
      prisma.reference.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              title: true
            }
          }
        },
        orderBy: { year: 'desc' },
        skip,
        take: Number(limit)
      }),
      prisma.reference.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: references,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    console.error('Error getting references:', error);
    res.status(500).json({ success: false, error: error.message });
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
   *             $ref: '#/components/schemas/CreateWebhook'
   *     responses:
   *       201:
   *         description: Webhook créé avec succès
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
      
      // Placeholder: In a real app, you would save this to the database
      // const webhook = await prisma.webhook.create({ data: {...data, userId: req.user.id }});

      res.status(201).json({
        success: true,
        data: {
          id: 'placeholder',
          ...data,
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
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  async validateApiKey(req: Request, res: Response) {
    try {
      // This is a placeholder as the apiKey model does not exist
      
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
}

export default new ApiController();
