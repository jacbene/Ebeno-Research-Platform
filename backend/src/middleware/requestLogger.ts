// backend/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logHttp } from '../utils/logger';

// ✅ Routes ignorées (trop bruyantes)
const IGNORED_PATHS = [
  '/',
  '/api/health',
  '/api/health/ready',
  '/api/health/db',
  '/api/health/breakers',
];

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    // Skip les health checks
    if (IGNORED_PATHS.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
      return;
    }

    const duration = Date.now() - start;
    const userId = (req as any).user?.id;

    logHttp(req.method, req.originalUrl, res.statusCode, duration, userId);
  });

  next();
};
