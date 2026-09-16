// backend/src/middleware/invalidateStatsCache.ts
import { Request, Response, NextFunction } from 'express';
import { invalidateUserStats } from '../services/statsCache';

export const invalidateStatsOnWrite = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    // Invalide uniquement si la requête a réussi et modifie des données
    if (res.statusCode < 400 && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const userId = (req as any).user?.id;
      if (userId) invalidateUserStats(userId);
    }
    return originalJson(body);
  };
  next();
};
