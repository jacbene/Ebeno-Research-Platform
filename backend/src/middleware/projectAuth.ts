// backend/src/middleware/projectAuth.ts
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';

/**
 * Middleware de sécurité : vérifie que l'utilisateur authentifié
 * est bien membre du projet ciblé.
 */
export const requireProjectMember = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  // L'ID du projet peut venir du body (POST), des params (/:projectId), ou du query (?projectId=...)
  const projectId = req.body.projectId || req.params.projectId || req.query.projectId;

  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  if (!projectId) {
    return res.status(400).json({ error: 'projectId est requis' });
  }

  try {
    const membership = await db('project_members')
      .where({ projectId, userId })
      .first();

    if (!membership) {
      // 404 intentionnel : on ne révèle pas l'existence du projet à un non-membre
      return res.status(404).json({ error: 'Projet introuvable ou accès refusé' });
    }

    // On attache le projectId pour les handlers suivants
    (req as any).projectId = projectId;
    next();
  } catch (error: any) {
    return res.status(500).json({ error: 'Erreur de vérification des droits' });
  }
};
