// backend/src/controllers/searchController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

export const globalSearch = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const query = String(req.query.q || '').trim();
    const limit = Math.min(Number(req.query.limit) || 20, 50);

    if (query.length < 2) {
      return res.json({
        success: true,
        data: { query, results: [], total: 0 },
      });
    }

    const likePattern = `%${query.toLowerCase()}%`;

    // ✅ 1. Fichiers uploadés
    const files = await db('project_files')
      .where({ userId })
      .whereNull('deletedAt')
      .whereRaw('LOWER("fileName") LIKE ?', [likePattern])
      .limit(limit);

    // ✅ 2. Transcriptions
    const transcriptions = await db('transcriptions')
      .where({ userId })
      .whereNull('deletedAt')
      .where(function () {
        this.whereRaw('LOWER(title) LIKE ?', [likePattern])
          .orWhereRaw('LOWER("transcriptText") LIKE ?', [likePattern]);
      })
      .limit(limit);

    // ✅ 3. Memos
    const memos = await db('memos')
      .where({ userId })
      .whereNull('deletedAt')
      .where(function () {
        this.whereRaw('LOWER(title) LIKE ?', [likePattern])
          .orWhereRaw('LOWER(content) LIKE ?', [likePattern]);
      })
      .limit(limit);

    // ✅ 4. Documents collaboratifs (uniquement ceux des projets où l'utilisateur est membre)
    const collaborativeDocs = await db('collaboration_documents')
      .join('project_members', 'collaboration_documents.projectId', 'project_members.projectId')
      .where('project_members.userId', userId)
      .where(function () {
        this.whereRaw('LOWER(collaboration_documents.title) LIKE ?', [likePattern])
          .orWhereRaw('LOWER(collaboration_documents.content) LIKE ?', [likePattern]);
      })
      .select(
        'collaboration_documents.id',
        'collaboration_documents.title',
        'collaboration_documents.content',
        'collaboration_documents.projectId',
        'collaboration_documents.updatedAt'
      )
      .limit(limit);

    // ✅ 5. Récupérer les titres des projets liés (pour le contexte)
    const projectIds = new Set<string>();
    files.forEach((f) => projectIds.add(f.projectId));
    transcriptions.forEach((t) => t.projectId && projectIds.add(t.projectId));
    memos.forEach((m) => m.projectId && projectIds.add(m.projectId));
    collaborativeDocs.forEach((d) => projectIds.add(d.projectId));

    const projects = projectIds.size > 0
      ? await db('projects').whereIn('id', Array.from(projectIds)).select('id', 'title')
      : [];

    const projectMap = new Map(projects.map((p) => [p.id, p.title]));

    // ✅ 6. Formater les résultats
    const results: any[] = [];

    files.forEach((f) => {
      results.push({
        id: f.id,
        type: 'file',
        title: f.fileName,
        snippet: `Fichier • ${(f.fileSize / 1024).toFixed(1)} KB`,
        projectId: f.projectId,
        projectTitle: projectMap.get(f.projectId) || 'Projet inconnu',
        date: f.uploadedAt,
        url: `/project/${encodeURIComponent(f.projectId)}`,
        icon: '📎',
      });
    });

    transcriptions.forEach((t) => {
      const snippet = t.transcriptText
        ? t.transcriptText.substring(0, 120)
        : `${t.type === 'audio' ? 'Transcription audio' : 'Texte importé'} (${t.status})`;
      results.push({
        id: t.id,
        type: 'transcription',
        title: t.title,
        snippet,
        projectId: t.projectId,
        projectTitle: t.projectId ? projectMap.get(t.projectId) || 'Projet inconnu' : 'Sans projet',
        date: t.createdAt,
        url: t.projectId
          ? `/project/${encodeURIComponent(t.projectId)}`
          : `/transcriptions`,
        icon: t.type === 'audio' ? '🎙️' : '📄',
      });
    });

    memos.forEach((m) => {
      results.push({
        id: m.id,
        type: 'memo',
        title: m.title,
        snippet: m.content ? m.content.substring(0, 120) : 'Memo vide',
        projectId: m.projectId,
        projectTitle: m.projectId ? projectMap.get(m.projectId) || 'Projet inconnu' : 'Sans projet',
        date: m.createdAt,
        url: m.projectId ? `/project/${encodeURIComponent(m.projectId)}` : '/',
        icon: '📝',
      });
    });

    collaborativeDocs.forEach((d) => {
      results.push({
        id: d.id,
        type: 'document',
        title: d.title,
        snippet: d.content ? d.content.substring(0, 120) : 'Document vide',
        projectId: d.projectId,
        projectTitle: projectMap.get(d.projectId) || 'Projet inconnu',
        date: d.updatedAt,
        url: `/collaboration?projectId=${encodeURIComponent(d.projectId)}`,
        icon: '🤝',
      });
    });

    // ✅ 7. Trier par date décroissante
    results.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    logger.info(`🔍 Recherche "${query}" → ${results.length} résultats`, { userId });

    return res.json({
      success: true,
      data: {
        query,
        results: results.slice(0, limit * 2),
        total: results.length,
      },
    });
  } catch (error: any) {
    logger.error('❌ Erreur globalSearch:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};
