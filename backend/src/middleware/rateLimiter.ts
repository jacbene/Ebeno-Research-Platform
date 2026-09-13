// backend/src/middleware/rateLimiter.ts
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import requestIp from 'request-ip';
import { Request } from 'express';

/**
 * ✅ Générateur de clé basé sur l'IP réelle du client
 * Utilise ipKeyGenerator pour normaliser les adresses IPv6
 */
const keyGenerator = (req: Request): string => {
  const clientIp = requestIp.getClientIp(req) || req.ip || 'unknown';
  // ✅ Normalise les IPv6 (sous-réseau /64)
  return ipKeyGenerator(clientIp);
};

/**
 * Gestionnaire de dépassement (log + réponse JSON)
 */
const handler = (req: Request, res: any) => {
  const clientIp = requestIp.getClientIp(req) || req.ip;
  console.warn(`⚠️ Rate limit dépassé pour IP: ${clientIp} sur ${req.originalUrl}`);
  res.status(429).json({
    success: false,
    error: 'Trop de requêtes. Veuillez réessayer plus tard.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

/**
 * Limiteur global : 100 requêtes / minute par IP
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator,
  handler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * Limiteur strict pour l'authentification : 5 tentatives / 15 min
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator,
  handler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

/**
 * Limiteur pour l'upload : 20 uploads / heure par IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator,
  handler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * Limiteur pour les services IA : 30 / heure par IP
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  keyGenerator,
  handler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

/**
 * Limiteur très strict pour les routes sensibles (reset password, etc.)
 */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator,
  handler,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
