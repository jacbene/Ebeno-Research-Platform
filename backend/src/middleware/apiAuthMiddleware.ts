// backend/middleware/apiAuthMiddleware.ts
// Middleware pour l'authentification par clé API
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

export const apiAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Vérifier l'en-tête Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Clé API manquante. Utilisez le format: Bearer <votre_clé_api>'
        }
      });
    }
    
    const apiKey = authHeader.substring(7); // Retirer 'Bearer '
    
    // Hacher la clé pour la comparaison
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Rechercher la clé dans la base de données
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true
          }
        }
      }
    });
    
    if (!apiKeyRecord) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Clé API invalide, expirée ou révoquée'
        }
      });
    }
    
    // Vérifier les scopes
    const requiredScopes = this.getRequiredScopes(req);
    const hasRequiredScopes = requiredScopes.every(scope => 
      apiKeyRecord.scopes.includes(scope) || 
      apiKeyRecord.scopes.includes('admin') ||
      apiKeyRecord.scopes.includes('*')
    );
    
    if (!hasRequiredScopes) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPES',
          message: 'Permissions insuffisantes',
          requiredScopes,
          availableScopes: apiKeyRecord.scopes
        }
      });
    }
    
    // Mettre à jour la date de dernière utilisation
    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() }
    });
    
    // Journaliser la requête
    await this.logApiRequest(req, apiKeyRecord);
    
    // Ajouter les informations à la requête
    (req as any).apiKey = apiKeyRecord;
    (req as any).user = apiKeyRecord.user;
    
    next();
  } catch (error) {
    console.error('Erreur d\'authentification API:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Erreur d\'authentification'
      }
    });
  }
};

// Service de rate limiting pour l'API
export const apiRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = (req as any).apiKey;
    if (!apiKey) return next();
    
    const userId = apiKey.userId;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Compter les requêtes récentes
    const [minuteCount, hourCount] = await Promise.all([
      prisma.apiLog.count({
        where: {
          userId,
          createdAt: { gte: oneMinuteAgo }
        }
      }),
      prisma.apiLog.count({
        where: {
          userId,
          createdAt: { gte: oneHourAgo }
        }
      })
    ]);
    
    // Limites selon le plan de l'utilisateur
    const userPlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    const plan = userPlan?.plan || 'free';
    const limits = {
      free: { perMinute: 60, perHour: 1000 },
      pro: { perMinute: 300, perHour: 10000 },
      enterprise: { perMinute: 1000, perHour: 50000 }
    };
    
    const limit = limits[plan] || limits.free;
    
    if (minuteCount >= limit.perMinute) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requêtes par minute atteinte',
          retryAfter: 60,
          limit: limit.perMinute,
          remaining: 0
        },
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': limit.perMinute.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + 60).toString()
        }
      });
    }
    
    if (hourCount >= limit.perHour) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requêtes par heure atteinte',
          retryAfter: 3600,
          limit: limit.perHour,
          remaining: 0
        },
        headers: {
          'Retry-After': '3600',
          'X-RateLimit-Limit': limit.perHour.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + 3600).toString()
        }
      });
    }
    
    // Ajouter les en-têtes de rate limiting
    res.set({
      'X-RateLimit-Limit': limit.perMinute.toString(),
      'X-RateLimit-Remaining': (limit.perMinute - minuteCount - 1).toString(),
      'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + 60).toString()
    });
    
    next();
  } catch (error) {
    console.error('Erreur de rate limiting:', error);
    next();
  }
};

// Méthodes utilitaires
const getRequiredScopes = (req: Request): string[] => {
  const method = req.method;
  const path = req.path;
  
  // Définir les scopes requis par endpoint
  const scopeMap: Record<string, string[]> = {
    'GET /api/v1/projects': ['read:projects'],
    'POST /api/v1/projects': ['write:projects'],
    'GET /api/v1/projects/:id': ['read:projects'],
    'PUT /api/v1/projects/:id': ['write:projects'],
    'DELETE /api/v1/projects/:id': ['write:projects'],
    
    'GET /api/v1/documents': ['read:documents'],
    'POST /api/v1/documents': ['write:documents'],
    'GET /api/v1/documents/:id': ['read:documents'],
    'PUT /api/v1/documents/:id': ['write:documents'],
    
    'POST /api/v1/transcriptions': ['write:transcriptions'],
    'GET /api/v1/transcriptions/:id': ['read:transcriptions'],
    
    'GET /api/v1/codes': ['read:codes'],
    'POST /api/v1/codes': ['write:codes'],
    
    'GET /api/v1/references': ['read:references'],
    'POST /api/v1/references': ['write:references'],
    
    'GET /api/v1/analytics': ['read:analytics'],
    
    // Endpoints d'administration
    'GET /api/v1/admin/*': ['admin'],
    'POST /api/v1/admin/*': ['admin'],
    'PUT /api/v1/admin/*': ['admin'],
    'DELETE /api/v1/admin/*': ['admin']
  };
  
  // Trouver le pattern correspondant
  const route = `${method} ${path}`;
  
  for (const [pattern, scopes] of Object.entries(scopeMap)) {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      if (regex.test(route)) {
        return scopes;
      }
    } else if (pattern === route) {
      return scopes;
    }
  }
  
  // Scope par défaut pour les méthodes
  if (method === 'GET') return ['read'];
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') return ['write'];
  
  return [];
};

const logApiRequest = async (req: Request, apiKey: any) => {
  try {
    await prisma.apiLog.create({
      data: {
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || '',
        status: 0, // Sera mis à jour dans le middleware de réponse
        responseTime: 0,
        requestSize: JSON.stringify(req.body).length,
        queryParams: JSON.stringify(req.query)
      }
    });
  } catch (error) {
    console.error('Erreur de journalisation API:', error);
  }
};

// Middleware pour mettre à jour le log après la réponse
export const apiLogMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();
  
  // Intercepter la réponse
  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    
    // Mettre à jour le log (de façon asynchrone)
    updateApiLog(req, res.statusCode, responseTime).catch(console.error);
    
    return originalSend.call(this, body);
  };
  
  next();
};

const updateApiLog = async (req: Request, statusCode: number, responseTime: number) => {
  try {
    // Trouver le log le plus récent pour cette requête
    const log = await prisma.apiLog.findFirst({
      where: {
        userId: (req as any).user?.id,
        endpoint: req.path,
        method: req.method,
        status: 0
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (log) {
      await prisma.apiLog.update({
        where: { id: log.id },
        data: {
          status: statusCode,
          responseTime
        }
      });
    }
  } catch (error) {
    console.error('Erreur de mise à jour du log API:', error);
  }
};
