// backend/src/middleware/invalidateStatsCache.ts
import { Request, Response, NextFunction } from 'express';
import { invalidateUserStats } from '../services/statsCache';

/**
 * Middleware qui invalide le cache des stats utilisateur
 * après toute opération d'écriture réussie (POST / PUT / PATCH / DELETE).
 *
 * ⚠️ Ce middleware suppose que `req.user.id` est disponible (donc monté
 *    APRÈS le middleware d'authentification, ou sur des routes authentifiées).
 *
 * Pour l'utiliser globalement, on accroche le hook sur res.json et on
 * vérifie le statusCode + la méthode HTTP.
 */
export const invalidateStatsOnWrite = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const originalJson = res.json.bind(res);

  res.json = (body: any) => {
    // Invalide uniquement si :
    //   - la requête a réussi (status < 400)
    //   - c'est une méthode qui modifie les données
    //   - on a un userId identifiable
    if (
      res.statusCode < 400 &&
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    ) {
      const userId = (req as any).user?.id;
      if (userId) {
        invalidateUserStats(userId);
      }
    }

    return originalJson(body);
  };

  next();
};
