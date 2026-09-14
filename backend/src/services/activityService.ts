// backend/src/services/activityService.ts
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { emitGlobal } from '../socketManager';

interface LogActivityInput {
  projectId?: string;  // ✅ Optionnel
  userId: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async (input: LogActivityInput): Promise<void> => {
  // ✅ Ne rien faire si projectId manquant (ex: transcription globale)
  if (!input.projectId) {
    logger.debug(`⏭️ [activity] Ignorée (pas de projet) : ${input.action}`);
    return;
  }

  try {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const activity = {
      id,
      projectId: input.projectId,
      userId: input.userId,
      userName: input.userName || 'Utilisateur',
      action: input.action,
      targetType: input.targetType || null,
      targetId: input.targetId || null,
      targetName: input.targetName || null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      createdAt: new Date().toISOString(),
    };

    await db('project_activity').insert(activity);

    logger.info(`📋 Activité enregistrée : ${input.action}`, {
      projectId: input.projectId,
      userId: input.userId,
    });

    emitGlobal('activity-created', {
      projectId: input.projectId,
      activity: { ...activity, metadata: input.metadata || null },
    });
  } catch (error: any) {
    logger.warn(`⚠️ Impossible d'enregistrer l'activité : ${error.message}`);
  }
};

export const getProjectActivity = async (
  projectId: string,
  limit = 50
): Promise<any[]> => {
  const rows = await db('project_activity')
    .where({ projectId })
    .orderBy('createdAt', 'desc')
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
};
