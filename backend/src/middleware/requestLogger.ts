// backend/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { logHttp } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Intercepter la fin de la réponse
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userId = (req as any).user?.id;

    // Ne pas logger les health checks pour éviter le bruit
    if (req.path === '/api/health' || req.path === '/') return;

    logHttp(
      req.method,
      req.originalUrl,
      res.statusCode,
      duration,
      userId
    );
  });

  next();
};
