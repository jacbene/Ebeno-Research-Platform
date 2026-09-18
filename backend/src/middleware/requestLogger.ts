// backend/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logHttp } from '../utils/logger';

// ✅ Routes ignorées (health checks, racine)
const IGNORED_PATHS = [
  '/',
  '/api/health',
  '/api/health/ready',
  '/api/health/db',
  '/api/health/breakers',
];

// ✅ Log unique au démarrage (permet de confirmer le chargement en prod)
console.log(
  `[requestLogger] Filtre actif — ${IGNORED_PATHS.length} paths ignorés:`,
  IGNORED_PATHS.join(', ')
);

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // ✅ Filtrage AVANT tout. Utilise req.originalUrl (contient toujours le path complet).
  //    On strip les query params pour matcher sur le pathname pur.
  const pathname = req.originalUrl.split('?')[0];
  const shouldSkip = IGNORED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );

  if (shouldSkip) {
    // Aucun listener attaché → zéro coût pour les health checks
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.id;
    logHttp(req.method, req.originalUrl, res.statusCode, duration, userId);
  });

  next();
};
