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
    // Si projectId spécifié : tous les fichiers du projet (peu importe l'auteur)
    // Sinon : fichiers de l'utilisateur (tous projets)
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

    // ✅ 5. Entités extraites
    let entitiesQuery = db('document_entities')
      .join('transcriptions', 'document_entities.documentId', 'transcriptions.id')
      .whereNull('transcriptions.deletedAt');
    if (projectId) {
      entitiesQuery = entitiesQuery.where('transcriptions.projectId', projectId);
    } else {
      entitiesQuery = entitiesQuery.where('transcriptions.userId', userId);
    }
    const entitiesResult = await entitiesQuery.clone().count('document_entities.id as count').first();
    const totalEntities = Number(entitiesResult?.count || 0);

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
      // Fichiers des projets où l'utilisateur est membre
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

    logger.info(`📊 Stats dashboard pour ${userId}${projectId ? ` [projet: ${projectId}]` : ''}`, {
      projects: totalProjects,
      files: totalFiles,
      audio: totalAudio,
      texts: totalTexts,
    });

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
