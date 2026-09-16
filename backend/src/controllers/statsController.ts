// backend/src/controllers/statsController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    // ✅ 1. Compter les projets de l'utilisateur
    const projectsCount = await db('project_members')
      .where({ userId })
      .count('projectId as count')
      .first();
    const totalProjects = Number(projectsCount?.count || 0);

    // ✅ 2. Compter les fichiers uploadés
    const filesCount = await db('project_files')
      .where({ userId })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const totalFiles = Number(filesCount?.count || 0);

    // ✅ 3. Compter les transcriptions
    const transcriptionsCount = await db('transcriptions')
      .where({ userId })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const totalTranscriptions = Number(transcriptionsCount?.count || 0);

    // ✅ 4. Compter les memos
    const memosCount = await db('memos')
      .where({ userId })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const totalMemos = Number(memosCount?.count || 0);

    // ✅ 5. Compter les entités extraites (via les documents de l'utilisateur)
    const entitiesResult = await db('document_entities')
      .join('transcriptions', 'document_entities.documentId', 'transcriptions.id')
      .where('transcriptions.userId', userId)
      .count('document_entities.id as count')
      .first();
    const totalEntities = Number(entitiesResult?.count || 0);

    // ✅ 6. Compter les documents collaboratifs
    const docsCount = await db('collaboration_documents')
      .join('project_members', 'collaboration_documents.projectId', 'project_members.projectId')
      .where('project_members.userId', userId)
      .count('collaboration_documents.id as count')
      .first();
    const totalCollaborativeDocs = Number(docsCount?.count || 0);

    // ✅ 7. Activité récente (10 dernières actions)
    const recentActivity = await db('project_activity')
      .where({ userId })
      .orderBy('createdAt', 'desc')
      .limit(10);

    // ✅ 8. Projets récents (5 derniers)
    const recentProjects = await db('projects')
      .join('project_members', 'projects.id', 'project_members.projectId')
      .where('project_members.userId', userId)
      .select('projects.*')
      .orderBy('projects.updatedAt', 'desc')
      .limit(5);

    // ✅ 9. Progression des transcriptions
    const pendingCount = await db('transcriptions')
      .where({ userId, status: 'PENDING' })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const processingCount = await db('transcriptions')
      .where({ userId, status: 'PROCESSING' })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const completedCount = await db('transcriptions')
      .where({ userId, status: 'COMPLETED' })
      .whereNull('deletedAt')
      .count('id as count')
      .first();
    const failedCount = await db('transcriptions')
      .where({ userId, status: 'FAILED' })
      .whereNull('deletedAt')
      .count('id as count')
      .first();

    logger.info(`📊 Stats dashboard pour ${userId}`, {
      projects: totalProjects,
      files: totalFiles,
      transcriptions: totalTranscriptions,
      memos: totalMemos,
    });

    return res.json({
      success: true,
      data: {
        counts: {
          projects: totalProjects,
          files: totalFiles,
          transcriptions: totalTranscriptions,
          memos: totalMemos,
          entities: totalEntities,
          collaborativeDocs: totalCollaborativeDocs,
        },
        transcriptionStatus: {
          pending: Number(pendingCount?.count || 0),
          processing: Number(processingCount?.count || 0),
          completed: Number(completedCount?.count || 0),
          failed: Number(failedCount?.count || 0),
        },
        recentActivity: recentActivity.map((a) => ({
          ...a,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
        })),
        recentProjects,
      },
    });
  } catch (error: any) {
    logger.error('❌ Erreur getDashboardStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};
