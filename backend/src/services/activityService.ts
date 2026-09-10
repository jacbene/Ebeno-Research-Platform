// backend/src/services/activityService.ts
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { emitGlobal } from '../socketManager';

interface LogActivityInput {
  projectId: string;
  userId: string;
  userName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, any>;
}

/**
 * Enregistre une activité + émet un événement Socket.IO
 */
export const logActivity = async (input: LogActivityInput): Promise<void> => {
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
      targetId: input.targetId,
    });

    // 📡 Émettre l'événement temps réel
    emitGlobal('activity-created', {
      projectId: input.projectId,
      activity: {
        ...activity,
        metadata: input.metadata || null,
      },
    });
  } catch (error: any) {
    logger.warn(`⚠️ Impossible d'enregistrer l'activité : ${error.message}`);
  }
};

/**
 * Récupère les activités récentes d'un projet
 */
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
