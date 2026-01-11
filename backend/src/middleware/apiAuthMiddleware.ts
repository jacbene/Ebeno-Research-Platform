// backend/middleware/apiAuthMiddleware.ts
// Middleware pour l'authentification par clé API
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

// ==================== DÉCLARATIONS DE TYPES ====================
interface ApiKeyRecord {
  id: string;
  userId: string;
  keyHash: string;
  scopes: string[];
  revokedAt: Date | null;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    isVerified: boolean;
  };
}

interface UserPlan {
  plan: 'free' | 'pro' | 'enterprise';
}

// Déclaration globale cohérente
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyRecord;
      user?: {
        id: string;
        email: string;
        name: string | null;
        role: string;
        isVerified: boolean;
      };
    }
  }
}

// ==================== MÉTHODES UTILITAIRES ====================
const getRequiredScopes = (req: Request): string[] => {
  const method = req.method;
  const path = req.path;

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
    'GET /api/v1/admin/*': ['admin'],
    'POST /api/v1/admin/*': ['admin'],
    'PUT /api/v1/admin/*': ['admin'],
    'DELETE /api/v1/admin/*': ['admin']
  };

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

  if (method === 'GET') return ['read'];
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') return ['write'];

  return [];
};

const logApiRequest = async (req: Request, apiKey: ApiKeyRecord) => {
  try {
    await prisma.apiLog.create({
      data: {
        userId: apiKey.userId,
        apiKeyId: apiKey.id,
        endpoint: req.path,
        method: req.method,
        ipAddress: req.ip || '',
        userAgent: Array.isArray(req.headers['user-agent']) ? req.headers['user-agent'].join(', ') : req.headers['user-agent'] || '',
        status: 0,
        responseTime: 0,
        requestSize: JSON.stringify(req.body).length,
        queryParams: JSON.stringify(req.query)
      }
    });
  } catch (error) {
    console.error('Erreur de journalisation API:', error);
  }
};

const updateApiLog = async (req: Request, statusCode: number, responseTime: number) => {
  try {
    if (!req.user || !req.user.id) {
        return;
    }
    const log = await prisma.apiLog.findFirst({
      where: {
        userId: req.user.id,
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

// ==================== MIDDLEWARE D'AUTHENTIFICATION API ====================
export const apiAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
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

    const apiKey = authHeader.substring(7);
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

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
            role: true,
            isVerified: true // Ajouté
          }
        }
      }
    }) as ApiKeyRecord | null;

    if (!apiKeyRecord) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Clé API invalide, expirée ou révoquée'
        }
      });
    }

    const requiredScopes = getRequiredScopes(req);
    const hasRequiredScopes = requiredScopes.every((scope: string) =>
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

    await prisma.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() }
    });

    await logApiRequest(req, apiKeyRecord);

    req.apiKey = apiKeyRecord;
    req.user = apiKeyRecord.user;

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

// ==================== SERVICE DE RATE LIMITING ====================
export const apiRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.apiKey;
    if (!apiKey) return next();

    const userId = apiKey.userId;
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

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

    const userPlan = await prisma.userPlan.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    type PlanType = 'free' | 'pro' | 'enterprise';
    const plan: PlanType = userPlan ? userPlan.planType.toLowerCase() as PlanType : 'free';

    const limits: Record<PlanType, { perMinute: number; perHour: number }> = {
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

// ==================== MIDDLEWARE DE JOURNALISATION API ====================
export const apiLogMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  const originalSend = res.send;
  res.send = function(body) {
    const responseTime = Date.now() - startTime;

    updateApiLog(req, res.statusCode, responseTime).catch(console.error);

    return originalSend.call(this, body);
  };

  next();
};

export default {
  apiAuthMiddleware,
  apiRateLimiter,
  apiLogMiddleware
};
