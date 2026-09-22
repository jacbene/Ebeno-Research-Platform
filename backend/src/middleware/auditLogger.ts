// backend/src/middleware/auditLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logAuditFromReq } from '../services/auditLogService';
import { logger } from '../utils/logger';

/**
 * Routes ignorées par l'audit automatique.
 */
const IGNORED_PATHS = [
  '/api/health',
  '/api/auth/me',
  '/api/language/me',
  '/api/stats',
  '/api/admin',
];

/**
 * Détermine l'action à partir de la méthode + du path.
 */
const inferAction = (method: string, path: string): string | null => {
  const cleanPath = path.split('?')[0];

  const methodMap: Record<string, string> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };

  const verb = methodMap[method];
  if (!verb) return null;

  const segments = cleanPath.replace(/^\/api\//, '').split('/');
  const resource = segments[0];
  if (!resource) return null;

  // Cas spéciaux
  if (cleanPath.endsWith('/trash/empty')) return `${resource}_empty_trash`;
  if (cleanPath.includes('/trash')) return `${resource}_trash`;
  if (cleanPath.endsWith('/restore')) return `${resource}_restore`;
  if (cleanPath.endsWith('/permanent')) return `${resource}_permanent_delete`;
  if (cleanPath.endsWith('/retry')) return `${resource}_retry`;
  if (cleanPath.endsWith('/export')) return `${resource}_export`;
  if (cleanPath.endsWith('/avatar')) return `${resource}_avatar_upload`;

  return `${resource}_${verb}`;
};

/**
 * Extrait l'ID cible depuis le path.
 */
const extractTargetId = (path: string): string | null => {
  const cleanPath = path.split('?')[0];
  const segments = cleanPath.split('/').filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg.length > 10 && (seg.includes('-') || /^[a-zA-Z0-9]+$/.test(seg))) {
      if (['trash', 'restore', 'permanent', 'retry', 'export', 'empty'].includes(seg)) {
        continue;
      }
      return seg;
    }
  }
  return null;
};

/**
 * Middleware : log automatiquement toutes les actions mutantes.
 *
 * ✅ Utilise res.on('finish') → TOUJOURS déclenché, peu importe si le
 *    contrôleur appelle res.json / res.send / res.end.
 * ✅ Ne remplace PAS res.json → aucune interférence avec d'autres middlewares.
 */
export const auditLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Skip les méthodes non-mutantes
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip les paths ignorés
  const pathname = req.originalUrl.split('?')[0];
  if (IGNORED_PATHS.some((p) => pathname.startsWith(p))) {
    return next();
  }

  const action = inferAction(req.method, pathname);
  if (!action) return next();

  const targetId = extractTargetId(pathname);

  // ✅ DEBUG 1 : middleware exécuté
  console.log(`🔍 [auditLogger] ${req.method} ${pathname} → action=${action}`);

  // ✅ Log au finish (après envoi de la réponse)
  res.on('finish', () => {
    try {
      const user = (req as any).user;
      const status = res.statusCode >= 400 ? 'failure' : 'success';

      console.log(`✅ [auditLogger] Finish: ${action} status=${status} user=${user?.email || 'anon'}`);

      const metadata: Record<string, any> = {
        method: req.method,
        path: pathname,
        statusCode: res.statusCode,
      };

      // Sanitize body
      if (req.body && typeof req.body === 'object') {
        const sanitized = { ...req.body };
        delete sanitized.password;
        delete sanitized.currentPassword;
        delete sanitized.newPassword;
        delete sanitized.token;
        delete sanitized.content;
        delete sanitized.transcriptText;

        const keys = Object.keys(sanitized);
        if (keys.length > 0 && keys.length < 10) {
          metadata.body = sanitized;
        } else if (keys.length >= 10) {
          metadata.bodyFields = keys;
        }
      }

      // Log asynchrone
      logAuditFromReq(req, {
        userId: user?.id || null,
        userEmail: user?.email || null,
        action,
        targetType: pathname.replace(/^\/api\//, '').split('/')[0],
        targetId,
        targetName: null,
        status,
        metadata,
      })
        .then(() => {
          console.log(`💾 [auditLogger] Log enregistré : ${action}`);
        })
        .catch((err) => {
          console.error(`❌ [auditLogger] Erreur log : ${err.message}`);
        });
    } catch (err: any) {
      console.error(`❌ [auditLogger] Exception dans res.on('finish') : ${err.message}`);
    }
  });

  next();
};
