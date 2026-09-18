// backend/src/controllers/statsController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  buildStatsKey,
  getCachedStats,
  setCachedStats,
} from '../services/statsCache';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const projectId = req.query.projectId ? String(req.query.projectId) : null;
    const isFiltered = !!projectId;

    // ============================================================
    // CACHE : court-circuit si dispo
    // ============================================================
    const cacheKey = buildStatsKey(userId, projectId);
    const cached = getCachedStats<any>(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // ============================================================
    // VÉRIFICATION D'ACCÈS (si filtré)
    // ============================================================
    if (projectId) {
      const member = await db('project_members')
        .where({ projectId, userId })
        .first();
      if (!member) {
        return res
          .status(403)
          .json({ success: false, message: 'Accès non autorisé à ce projet' });
      }
    }

    // ============================================================
    // SOUS-REQUÊTES RÉUTILISABLES
    // ============================================================
    const accessibleFileIds = () => {
      const q = db('project_files').whereNull('deletedAt').select('id');
      return projectId ? q.where({ projectId }) : q.where({ userId });
    };

    const accessibleTranscriptionIds = () => {
      const q = db('transcriptions').whereNull('deletedAt').select('id');
      return projectId ? q.where({ projectId }) : q.where({ userId });
    };

    const accessibleMemoIds = () => {
      const q = db('memos').whereNull('deletedAt').select('id');
      return projectId ? q.where({ projectId }) : q.where({ userId });
    };

    // ============================================================
    // TOUTES LES REQUÊTES INDÉPENDANTES EN PARALLÈLE
    // ============================================================
    const [
      projectsCount,
      filesCount,
      audioCount,
      textCount,
      memosCount,
      collaborationCount,
      entitiesCount,
      statusGroups,
      recentActivity,
      selectedProject,
    ] = await Promise.all([
      isFiltered
        ? Promise.resolve({ count: 1 })
        : db('project_members')
            .where({ userId })
            .count('projectId as count')
            .first(),

      (isFiltered
        ? db('project_files').where({ projectId })
        : db('project_files').where({ userId })
      )
        .whereNull('deletedAt')
        .count('id as count')
        .first(),

      (isFiltered
        ? db('transcriptions').where({ projectId })
        : db('transcriptions').where({ userId })
      )
        .whereNull('deletedAt')
        .where({ type: 'audio' })
        .count('id as count')
        .first(),

      (isFiltered
        ? db('transcriptions').where({ projectId })
        : db('transcriptions').where({ userId })
      )
        .whereNull('deletedAt')
        .where({ type: 'text' })
        .count('id as count')
        .first(),

      (isFiltered
        ? db('memos').where({ projectId })
        : db('memos').where({ userId })
      )
        .whereNull('deletedAt')
        .count('id as count')
        .first(),

      isFiltered
        ? db('collaboration_documents')
            .where({ projectId })
            .count('id as count')
            .first()
        : db('collaboration_documents')
            .whereIn(
              'projectId',
              db('project_members').select('projectId').where({ userId })
            )
            .count('id as count')
            .first(),

      db('document_entities')
        .where(function () {
          this.whereIn('documentId', accessibleFileIds())
            .orWhereIn('documentId', accessibleTranscriptionIds())
            .orWhereIn('documentId', accessibleMemoIds());
        })
        .count('id as count')
        .first(),

      (isFiltered
        ? db('transcriptions').where({ projectId })
        : db('transcriptions').where({ userId })
      )
        .whereNull('deletedAt')
        .where({ type: 'audio' })
        .select('status')
        .count('id as count')
        .groupBy('status'),

      (isFiltered
        ? db('project_activity').where({ projectId })
        : db('project_activity').where({ userId })
      )
        .orderBy('createdAt', 'desc')
        .limit(10),

      isFiltered
        ? db('projects').where({ id: projectId }).first()
        : Promise.resolve(null),
    ]);

    // ============================================================
    // TRAITEMENT DES ENTITÉS
    // ============================================================
    const totalEntities = Number((entitiesCount as any)?.count || 0);

    const topEntities: Array<{
      value: string;
      type: string;
      count: number;
      percentage: number;
    }> = [];

    if (totalEntities > 0) {
      const entitiesRaw = await db('document_entities')
        .where(function () {
          this.whereIn('documentId', accessibleFileIds())
            .orWhereIn('documentId', accessibleTranscriptionIds())
            .orWhereIn('documentId', accessibleMemoIds());
        })
        .select('entityValue', 'entityType')
        .groupBy('entityValue', 'entityType')
        .count('* as count')
        .orderBy('count', 'desc')
        .limit(30);

      const totalEntitiesCount = entitiesRaw.reduce(
        (acc, e: any) => acc + Number(e.count),
        0
      );

      entitiesRaw.forEach((e: any) => {
        topEntities.push({
          value: e.entityValue,
          type: e.entityType,
          count: Number(e.count),
          percentage:
            totalEntitiesCount > 0
              ? Math.round((Number(e.count) / totalEntitiesCount) * 100)
              : 0,
        });
      });
    }

    const entitiesByType = topEntities.reduce(
      (acc, e) => {
        if (!acc[e.type]) acc[e.type] = [];
        acc[e.type].push(e);
        return acc;
      },
      {} as Record<string, typeof topEntities>
    );

    // ============================================================
    // TRAITEMENT DES STATUTS
    // ============================================================
    const statusMap = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    (statusGroups as Array<{ status: string; count: string | number }>).forEach(
      (row) => {
        if (row.status in statusMap) {
          statusMap[row.status as keyof typeof statusMap] = Number(row.count);
        }
      }
    );

    // ============================================================
    // PROJETS RÉCENTS + FICHIERS RÉCENTS
    // ============================================================
    const [recentProjects, recentFiles] = await Promise.all([
      isFiltered
        ? Promise.resolve([])
        : db('projects')
            .join('project_members', 'projects.id', 'project_members.projectId')
            .where('project_members.userId', userId)
            .select('projects.*')
            .orderBy('projects.updatedAt', 'desc')
            .limit(5),

      (() => {
        const q = db('project_files')
          .join('users', 'project_files.userId', 'users.id')
          .whereNull('project_files.deletedAt')
          .select(
            'project_files.id',
            'project_files.fileName',
            'project_files.fileSize',
            'project_files.mimeType',
            'project_files.uploadedAt',
            'project_files.projectId',
            'project_files.language',        // ✅ AJOUTÉ
            'users.id as authorId',
            'users.name as authorName',
            'users.email as authorEmail',
            'users.avatar as authorAvatar'
          )
          .orderBy('project_files.uploadedAt', 'desc')
          .limit(20);

        if (isFiltered) {
          return q.where('project_files.projectId', projectId);
        }
        return q
          .join(
            'project_members',
            'project_files.projectId',
            'project_members.projectId'
          )
          .where('project_members.userId', userId);
      })(),
    ]);

    // ============================================================
    // RÉSULTAT FINAL
    // ============================================================
    const result = {
      projectId: projectId || null,
      selectedProject: selectedProject || null,
      counts: {
        projects: Number((projectsCount as any)?.count || 0),
        files: Number((filesCount as any)?.count || 0),
        audioTranscriptions: Number((audioCount as any)?.count || 0),
        textDocuments: Number((textCount as any)?.count || 0),
        transcriptions:
          Number((audioCount as any)?.count || 0) +
          Number((textCount as any)?.count || 0),
        memos: Number((memosCount as any)?.count || 0),
        entities: totalEntities,
        collaborativeDocs: Number((collaborationCount as any)?.count || 0),
      },
      transcriptionStatus: statusMap,
      recentActivity: (recentActivity as any[]).map((a) => ({
        ...a,
        metadata: a.metadata ? safeJsonParse(a.metadata) : null,
      })),
      recentProjects,
      recentFiles,
      topEntities,
      entitiesByType,
    };

    setCachedStats(cacheKey, result);

    logger.info(
      `📊 Stats dashboard pour ${userId}${
        projectId ? ` [projet: ${projectId}]` : ''
      }`,
      {
        projects: result.counts.projects,
        files: result.counts.files,
        audio: result.counts.audioTranscriptions,
        texts: result.counts.textDocuments,
        entities: totalEntities,
      }
    );

    return res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('❌ Erreur getDashboardStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

const safeJsonParse = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};
