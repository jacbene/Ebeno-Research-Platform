// backend/src/services/analyticsService.ts
// ✅ Service d'agrégation pour le dashboard analytics

import { db } from '../db/knex';
import { logger } from '../utils/logger';

export interface ActivityDay {
  date: string;      // YYYY-MM-DD
  count: number;
}

export interface DocumentsByType {
  audio: number;
  text: number;
  pdf: number;
  docx: number;
  image: number;
  other: number;
}

export interface ProjectRanking {
  projectId: string;
  title: string;
  activityCount: number;
  files: number;
  members: number;
  sizeBytes: number;
}

export interface TranscriptionStats {
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  withLanguage: Record<string, number>; // { fr: 5, en: 3, ... }
}

export interface IAUsage {
  summaries: number;
  translations: number;
  transcriptionCompleted: number;
}

export interface AnalyticsData {
  period: {
    days: number;
    since: string;
    until: string;
  };
  scope: {
    projectId: string | null;
    projectTitle: string | null;
  };
  activity: {
    documents: ActivityDay[];
    totalFiles: number;
    totalTranscriptions: number;
    totalMemos: number;
    totalComments: number;
  };
  documentsByType: DocumentsByType;
  topProjects: ProjectRanking[];
  transcriptionStats: TranscriptionStats;
  iaUsage: IAUsage;
  storage: {
    totalBytes: number;
    byType: Record<string, number>;
  };
}

// ============================================================
// Helpers
// ============================================================
const daysAgoISO = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const buildDateArray = (days: number): string[] => {
  const arr: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
};

// ============================================================
// ✅ FONCTION PRINCIPALE
// ============================================================
export const getAnalytics = async (
  userId: string,
  projectId: string | null,
  days: number = 30
): Promise<AnalyticsData> => {
  const since = daysAgoISO(days);
  const dateArray = buildDateArray(days);

  // ============================================================
  // 1. Récupérer les projets accessibles
  // ============================================================
  let projectQuery = db('project_members')
    .join('projects', 'project_members.projectId', 'projects.id')
    .where('project_members.userId', userId)
    .select('projects.id as projectId', 'projects.title');

  if (projectId) {
    projectQuery = projectQuery.where('projects.id', projectId);
  }

  const projects = await projectQuery;
  const projectIds = projects.map((p: any) => p.projectId);

  const scopeProject = projectId
    ? projects.find((p: any) => p.projectId === projectId) || null
    : null;

  if (projectIds.length === 0) {
    // Aucun projet → retour vide
    return {
      period: { days, since, until: new Date().toISOString() },
      scope: { projectId, projectTitle: scopeProject?.title || null },
      activity: {
        documents: dateArray.map((d) => ({ date: d, count: 0 })),
        totalFiles: 0,
        totalTranscriptions: 0,
        totalMemos: 0,
        totalComments: 0,
      },
      documentsByType: { audio: 0, text: 0, pdf: 0, docx: 0, image: 0, other: 0 },
      topProjects: [],
      transcriptionStats: {
        completed: 0,
        failed: 0,
        pending: 0,
        processing: 0,
        withLanguage: {},
      },
      iaUsage: { summaries: 0, translations: 0, transcriptionCompleted: 0 },
      storage: { totalBytes: 0, byType: {} },
    };
  }

  // ============================================================
  // 2. Activité par jour (fichiers + transcriptions + memos)
  // ============================================================
  const filesActivity = await db('project_files')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .where('uploadedAt', '>=', new Date(since).getTime())
    .select('uploadedAt');

  const transcriptionsActivity = await db('transcriptions')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .where('createdAt', '>=', since)
    .select('createdAt');

  const memosActivity = await db('memos')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .where('createdAt', '>=', since)
    .select('createdAt');

  // Agréger par jour
  const dayCounts: Record<string, number> = {};
  dateArray.forEach((d) => (dayCounts[d] = 0));

  const addToDay = (dateValue: any) => {
    try {
      const date = new Date(typeof dateValue === 'number' ? dateValue : dateValue);
      const key = date.toISOString().slice(0, 10);
      if (dayCounts[key] !== undefined) dayCounts[key]++;
    } catch { /* ignore */ }
  };

  filesActivity.forEach((f: any) => addToDay(f.uploadedAt));
  transcriptionsActivity.forEach((t: any) => addToDay(t.createdAt));
  memosActivity.forEach((m: any) => addToDay(m.createdAt));

  const documents: ActivityDay[] = dateArray.map((d) => ({
    date: d,
    count: dayCounts[d] || 0,
  }));

  // ============================================================
  // 3. Totaux
  // ============================================================
  const [totalFiles, totalTranscriptions, totalMemos] = await Promise.all([
    db('project_files').whereIn('projectId', projectIds).whereNull('deletedAt').count('id as count'),
    db('transcriptions').whereIn('projectId', projectIds).whereNull('deletedAt').count('id as count'),
    db('memos').whereIn('projectId', projectIds).whereNull('deletedAt').count('id as count'),
  ]);

  const totalCommentsResult = await db('comments')
    .whereIn('documentId',
      db('transcriptions').whereIn('projectId', projectIds).select('id')
    )
    .whereNull('deletedAt')
    .count('id as count')
    .catch(() => [{ count: 0 }]);

  // ============================================================
  // 4. Répartition par type de document
  // ============================================================
  const filesByExt = await db('project_files')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .select('fileName', 'mimeType', 'fileSize');

  const audioCount = await db('transcriptions')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .where({ type: 'audio' })
    .count('id as count');

  const textCount = await db('transcriptions')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .where({ type: 'text' })
    .count('id as count');

  const documentsByType: DocumentsByType = {
    audio: Number(audioCount[0]?.count || 0),
    text: Number(textCount[0]?.count || 0),
    pdf: 0,
    docx: 0,
    image: 0,
    other: 0,
  };

  const storageByType: Record<string, number> = {
    audio: 0,
    text: 0,
    pdf: 0,
    docx: 0,
    image: 0,
    other: 0,
  };

  filesByExt.forEach((f: any) => {
    const ext = (f.fileName.split('.').pop() || '').toLowerCase();
    const size = Number(f.fileSize || 0);

    if (['pdf'].includes(ext)) {
      documentsByType.pdf++;
      storageByType.pdf += size;
    } else if (['docx', 'doc'].includes(ext)) {
      documentsByType.docx++;
      storageByType.docx += size;
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      documentsByType.image++;
      storageByType.image += size;
    } else if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)) {
      documentsByType.audio++;
      storageByType.audio += size;
    } else if (['txt', 'md', 'csv', 'json', 'xml'].includes(ext)) {
      documentsByType.text++;
      storageByType.text += size;
    } else {
      documentsByType.other++;
      storageByType.other += size;
    }
  });

  const totalStorage = Object.values(storageByType).reduce((a, b) => a + b, 0);

  // ============================================================
  // 5. Top projets (par activité)
  // ============================================================
  const topProjects: ProjectRanking[] = [];

  for (const p of projects) {
    const [filesCount, transCount, memoCount, membersCount, storageSum] = await Promise.all([
      db('project_files').where({ projectId: p.projectId }).whereNull('deletedAt').count('id as count'),
      db('transcriptions').where({ projectId: p.projectId }).whereNull('deletedAt').count('id as count'),
      db('memos').where({ projectId: p.projectId }).whereNull('deletedAt').count('id as count'),
      db('project_members').where({ projectId: p.projectId }).count('id as count'),
      db('project_files').where({ projectId: p.projectId }).whereNull('deletedAt').sum('fileSize as total'),
    ]);

    const activityCount =
      Number(filesCount[0]?.count || 0) +
      Number(transCount[0]?.count || 0) +
      Number(memoCount[0]?.count || 0);

    topProjects.push({
      projectId: p.projectId,
      title: p.title,
      activityCount,
      files: Number(filesCount[0]?.count || 0),
      members: Number(membersCount[0]?.count || 0),
      sizeBytes: Number(storageSum[0]?.total || 0),
    });
  }

  topProjects.sort((a, b) => b.activityCount - a.activityCount);

  // ============================================================
  // 6. Statut des transcriptions + langues
  // ============================================================
  const transcriptionsStatus = await db('transcriptions')
    .whereIn('projectId', projectIds)
    .whereNull('deletedAt')
    .select('status', 'language');

  const transcriptionStats: TranscriptionStats = {
    completed: 0,
    failed: 0,
    pending: 0,
    processing: 0,
    withLanguage: {},
  };

  transcriptionsStatus.forEach((t: any) => {
    if (t.status === 'COMPLETED') transcriptionStats.completed++;
    else if (t.status === 'FAILED') transcriptionStats.failed++;
    else if (t.status === 'PENDING') transcriptionStats.pending++;
    else if (t.status === 'PROCESSING') transcriptionStats.processing++;

    if (t.language) {
      transcriptionStats.withLanguage[t.language] =
        (transcriptionStats.withLanguage[t.language] || 0) + 1;
    }
  });

  // ============================================================
  // 7. IA usage
  // ============================================================
  const [summaryCount, translationCount] = await Promise.all([
    db('document_summaries')
      .whereIn('documentId',
        db('transcriptions').whereIn('projectId', projectIds).select('id')
      )
      .count('id as count')
      .catch(() => [{ count: 0 }]),
    db('document_translations')
      .whereIn('documentId',
        db('transcriptions').whereIn('projectId', projectIds).select('id')
      )
      .count('id as count')
      .catch(() => [{ count: 0 }]),
  ]);

  const iaUsage: IAUsage = {
    summaries: Number(summaryCount[0]?.count || 0),
    translations: Number(translationCount[0]?.count || 0),
    transcriptionCompleted: transcriptionStats.completed,
  };

  // ============================================================
  // 8. Retour
  // ============================================================
  return {
    period: { days, since, until: new Date().toISOString() },
    scope: {
      projectId,
      projectTitle: scopeProject?.title || null,
    },
    activity: {
      documents,
      totalFiles: Number(totalFiles[0]?.count || 0),
      totalTranscriptions: Number(totalTranscriptions[0]?.count || 0),
      totalMemos: Number(totalMemos[0]?.count || 0),
      totalComments: Number(totalCommentsResult[0]?.count || 0),
    },
    documentsByType,
    topProjects,
    transcriptionStats,
    iaUsage,
    storage: {
      totalBytes: totalStorage,
      byType: storageByType,
    },
  };
};

export default { getAnalytics };
