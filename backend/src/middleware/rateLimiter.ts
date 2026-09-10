// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

/**
 * Limiteur global : 100 requêtes / minute par IP
 */
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de requêtes. Veuillez réessayer dans une minute.',
  },
});

/**
 * Limiteur strict pour l'authentification : 5 tentatives / 15 min
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Ne compte que les échecs
  message: {
    success: false,
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  },
});

/**
 * Limiteur pour l'upload : 20 uploads / heure par IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Trop de fichiers uploadés. Réessayez dans une heure.',
  },
});

/**
 * Limiteur pour les services IA (résumé, entités, etc.) : 30 / heure
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Quota IA atteint. Réessayez dans une heure.',
  },
});
