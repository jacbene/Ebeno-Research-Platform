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

    // ✅ Filtre optionnel par projet
    const projectId = req.query.projectId ? String(req.query.projectId) : null;

    // ✅ Si un projet est spécifié, vérifier que l'utilisateur y a accès
    if (projectId) {
      const member = await db('project_members')
        .where({ projectId, userId })
        .first();
      if (!member) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à ce projet' });
      }
    }

    // ============================================================
    // COMPTEURS
    // ============================================================

    // ✅ 1. Projets
    let totalProjects: number;
    if (projectId) {
      totalProjects = 1;
    } else {
      const projectsCount = await db('project_members')
        .where({ userId })
        .count('projectId as count')
        .first();
      totalProjects = Number(projectsCount?.count || 0);
    }

    // ✅ 2. Fichiers
    let filesQuery = db('project_files').whereNull('deletedAt');
    if (projectId) {
      filesQuery = filesQuery.where({ projectId });
    } else {
      filesQuery = filesQuery.where({ userId });
    }
    const filesCount = await filesQuery.clone().count('id as count').first();
    const totalFiles = Number(filesCount?.count || 0);

    // ✅ 3. Transcriptions audio
    let audioQuery = db('transcriptions').whereNull('deletedAt').where({ type: 'audio' });
    if (projectId) {
      audioQuery = audioQuery.where({ projectId });
    } else {
      audioQuery = audioQuery.where({ userId });
    }
    const audioCount = await audioQuery.clone().count('id as count').first();
    const totalAudio = Number(audioCount?.count || 0);

    // ✅ 3bis. Textes importés
    let textQuery = db('transcriptions').whereNull('deletedAt').where({ type: 'text' });
    if (projectId) {
      textQuery = textQuery.where({ projectId });
    } else {
      textQuery = textQuery.where({ userId });
    }
    const textCount = await textQuery.clone().count('id as count').first();
    const totalTexts = Number(textCount?.count || 0);

    // ✅ 4. Memos
    let memosQuery = db('memos').whereNull('deletedAt');
    if (projectId) {
      memosQuery = memosQuery.where({ projectId });
    } else {
      memosQuery = memosQuery.where({ userId });
    }
    const memosCount = await memosQuery.clone().count('id as count').first();
    const totalMemos = Number(memosCount?.count || 0);

    // ============================================================
    // ENTITÉS
    // ============================================================

    const fileIds = projectId
      ? (await db('project_files').where({ projectId }).whereNull('deletedAt').select('id')).map((r) => r.id)
      : (await db('project_files').where({ userId }).whereNull('deletedAt').select('id')).map((r) => r.id);

    const transcriptionIds = projectId
      ? (await db('transcriptions').where({ projectId }).whereNull('deletedAt').select('id')).map((r) => r.id)
      : (await db('transcriptions').where({ userId }).whereNull('deletedAt').select('id')).map((r) => r.id);

    const memoIds = projectId
      ? (await db('memos').where({ projectId }).whereNull('deletedAt').select('id')).map((r) => r.id)
      : (await db('memos').where({ userId }).whereNull('deletedAt').select('id')).map((r) => r.id);

    const allDocIds = [...fileIds, ...transcriptionIds, ...memoIds];

    let totalEntities = 0;
    const topEntities: Array<{ value: string; type: string; count: number; percentage: number }> = [];

    if (allDocIds.length > 0) {
      // Total
      const entitiesResult = await db('document_entities')
        .whereIn('documentId', allDocIds)
        .count('id as count')
        .first();
      totalEntities = Number(entitiesResult?.count || 0);

      // ✅ Top entités groupées par valeur + type
      const entitiesRaw = await db('document_entities')
        .whereIn('documentId', allDocIds)
        .select('entityValue', 'entityType')
        .groupBy('entityValue', 'entityType')
        .count('* as count')
        .orderBy('count', 'desc')
        .limit(30);

      const totalEntitiesCount = entitiesRaw.reduce((acc, e: any) => acc + Number(e.count), 0);

      entitiesRaw.forEach((e: any) => {
        topEntities.push({
          value: e.entityValue,
          type: e.entityType,
          count: Number(e.count),
          percentage: totalEntitiesCount > 0
            ? Math.round((Number(e.count) / totalEntitiesCount) * 100)
            : 0,
        });
      });
    }

    // ✅ Grouper par type pour l'affichage
    const entitiesByType = topEntities.reduce((acc, e) => {
      if (!acc[e.type]) acc[e.type] = [];
      acc[e.type].push(e);
      return acc;
    }, {} as Record<string, typeof topEntities>);

    // ✅ 6. Documents collaboratifs
    let docsQuery = db('collaboration_documents');
    if (projectId) {
      docsQuery = docsQuery.where({ projectId });
    } else {
      docsQuery = docsQuery
        .join('project_members', 'collaboration_documents.projectId', 'project_members.projectId')
        .where('project_members.userId', userId);
    }
    const docsCount = await docsQuery.clone().count('collaboration_documents.id as count').first();
    const totalCollaborativeDocs = Number(docsCount?.count || 0);

    // ============================================================
    // ACTIVITÉ RÉCENTE
    // ============================================================
    let activityQuery = db('project_activity').orderBy('createdAt', 'desc').limit(10);
    if (projectId) {
      activityQuery = activityQuery.where({ projectId });
    } else {
      activityQuery = activityQuery.where({ userId });
    }
    const recentActivity = await activityQuery;

    // ============================================================
    // PROJETS RÉCENTS
    // ============================================================
    let recentProjects: any[] = [];
    if (!projectId) {
      recentProjects = await db('projects')
        .join('project_members', 'projects.id', 'project_members.projectId')
        .where('project_members.userId', userId)
        .select('projects.*')
        .orderBy('projects.updatedAt', 'desc')
        .limit(5);
    }

    // ============================================================
    // FICHIERS RÉCENTS AVEC AUTEUR
    // ============================================================
    let recentFilesQuery = db('project_files')
      .join('users', 'project_files.userId', 'users.id')
      .whereNull('project_files.deletedAt')
      .select(
        'project_files.id',
        'project_files.fileName',
        'project_files.fileSize',
        'project_files.mimeType',
        'project_files.uploadedAt',
        'project_files.projectId',
        'users.id as authorId',
        'users.name as authorName',
        'users.email as authorEmail',
        'users.avatar as authorAvatar'
      )
      .orderBy('project_files.uploadedAt', 'desc')
      .limit(20);

    if (projectId) {
      recentFilesQuery = recentFilesQuery.where('project_files.projectId', projectId);
    } else {
      recentFilesQuery = recentFilesQuery
        .join('project_members', 'project_files.projectId', 'project_members.projectId')
        .where('project_members.userId', userId);
    }

    const recentFiles = await recentFilesQuery;

    // ============================================================
    // STATUT DES TRANSCRIPTIONS AUDIO
    // ============================================================
    const getStatusCount = async (status: string): Promise<number> => {
      let q = db('transcriptions')
        .where({ status, type: 'audio' })
        .whereNull('deletedAt');
      if (projectId) {
        q = q.where({ projectId });
      } else {
        q = q.where({ userId });
      }
      const result = await q.count('id as count').first();
      return Number(result?.count || 0);
    };

    const [pending, processing, completed, failed] = await Promise.all([
      getStatusCount('PENDING'),
      getStatusCount('PROCESSING'),
      getStatusCount('COMPLETED'),
      getStatusCount('FAILED'),
    ]);

    // ============================================================
    // NOM DU PROJET SÉLECTIONNÉ
    // ============================================================
    let selectedProject = null;
    if (projectId) {
      selectedProject = await db('projects').where({ id: projectId }).first();
    }

    logger.info(
      `📊 Stats dashboard pour ${userId}${projectId ? ` [projet: ${projectId}]` : ''}`,
      {
        projects: totalProjects,
        files: totalFiles,
        audio: totalAudio,
        texts: totalTexts,
        entities: totalEntities,
      }
    );

    return res.json({
      success: true,
      data: {
        projectId: projectId || null,
        selectedProject,
        counts: {
          projects: totalProjects,
          files: totalFiles,
          audioTranscriptions: totalAudio,
          textDocuments: totalTexts,
          transcriptions: totalAudio + totalTexts,
          memos: totalMemos,
          entities: totalEntities,
          collaborativeDocs: totalCollaborativeDocs,
        },
        transcriptionStatus: { pending, processing, completed, failed },
        recentActivity: recentActivity.map((a) => ({
          ...a,
          metadata: a.metadata ? JSON.parse(a.metadata) : null,
        })),
        recentProjects,
        recentFiles,
        topEntities,
        entitiesByType,
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
