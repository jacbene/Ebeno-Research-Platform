// backend/src/controllers/analyticsController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { getAnalytics } from '../services/analyticsService';
import { logger } from '../utils/logger';
import {
  buildStatsKey,
  getCachedStats,
  setCachedStats,
} from '../services/statsCache';

const CACHE_TTL = 30_000; // 30s

export const getAnalyticsDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const projectId = req.query.projectId ? String(req.query.projectId) : null;
    const days = Math.min(Number(req.query.days) || 30, 90);

    // ✅ Cache
    const cacheKey = `analytics:${userId}:${projectId || 'all'}:${days}`;
    const cached = getCachedStats<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // ✅ Vérification d'accès au projet
    if (projectId) {
      const member = await db('project_members').where({ projectId, userId }).first();
      if (!member) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
      }
    }

    const data = await getAnalytics(userId, projectId, days);

    setCachedStats(cacheKey, data, CACHE_TTL);

    return res.json({ success: true, data, cached: false });
  } catch (err: any) {
    logger.error(`❌ [analytics] ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ✅ Liste des projets pour le sélecteur
export const getAnalyticsProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const projects = await db('project_members')
      .join('projects', 'project_members.projectId', 'projects.id')
      .where('project_members.userId', userId)
      .select('projects.id as projectId', 'projects.title')
      .orderBy('projects.updatedAt', 'desc');

    return res.json({ success: true, projects });
  } catch (err: any) {
    logger.error(`❌ [analytics projects] ${err.message}`);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
