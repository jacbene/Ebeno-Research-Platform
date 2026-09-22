// backend/src/services/auditPurgeService.ts
import cron from 'node-cron';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { logAudit } from './auditLogService';

const DEFAULT_RETENTION_DAYS = 365;
const MAX_DELETE_PER_RUN = 10_000;

/**
 * Supprime les entrées d'audit_log plus anciennes que `retentionDays`.
 * @param retentionDays Nombre de jours à conserver (défaut : env ou 365)
 * @param dryRun Si true, compte sans supprimer
 */
export const purgeOldAuditLogs = async (
  retentionDays?: number,
  dryRun = false
): Promise<{ deleted: number; cutoffDate: string; retentionDays: number }> => {
  const retention =
    retentionDays ??
    Number(process.env.AUDIT_LOG_RETENTION_DAYS) ??
    DEFAULT_RETENTION_DAYS;

  const cutoff = new Date(Date.now() - retention * 24 * 60 * 60 * 1000);
  const cutoffISO = cutoff.toISOString();

  // 1. Compter les entrées à supprimer
  const countResult = await db('audit_log')
    .where('createdAt', '<', cutoffISO)
    .count('id as count')
    .first();

  const totalOld = Number((countResult as any)?.count || 0);

  if (dryRun) {
    logger.info(
      `🧪 [audit-purge] DRY-RUN : ${totalOld} entrée(s) à purger (rétention: ${retention}j, cutoff: ${cutoffISO})`
    );
    return { deleted: totalOld, cutoffDate: cutoffISO, retentionDays: retention };
  }

  if (totalOld === 0) {
    logger.info(`🧹 [audit-purge] Aucune entrée à purger (rétention: ${retention}j)`);
    return { deleted: 0, cutoffDate: cutoffISO, retentionDays: retention };
  }

  // 2. Suppression par batch (sécurité)
  let deleted = 0;
  while (deleted < totalOld) {
    const batch = await db('audit_log')
      .where('createdAt', '<', cutoffISO)
      .limit(Math.min(MAX_DELETE_PER_RUN, totalOld - deleted))
      .select('id');

    if (batch.length === 0) break;

    const ids = batch.map((r: any) => r.id);
    const count = await db('audit_log').whereIn('id', ids).delete();
    deleted += count;
  }

  logger.info(`🧹 [audit-purge] ${deleted} entrée(s) purgée(s) (cutoff: ${cutoffISO})`);

  return { deleted, cutoffDate: cutoffISO, retentionDays: retention };
};

/**
 * Démarre le cron quotidien de purge à 3h15.
 */
export const startAuditPurgeCron = (): void => {
  const retention = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || DEFAULT_RETENTION_DAYS;

  // Tous les jours à 03:15 (heure serveur)
  cron.schedule('15 3 * * *', async () => {
    logger.info('🧹 [audit-purge] Démarrage de la purge quotidienne...');

    try {
      const result = await purgeOldAuditLogs(retention, false);

      // Log l'action elle-même (sauf si 0 entrée)
      if (result.deleted > 0) {
        await logAudit({
          action: 'audit_log_purge',
          targetType: 'system',
          status: 'success',
          metadata: {
            deleted: result.deleted,
            retentionDays: result.retentionDays,
            cutoffDate: result.cutoffDate,
          },
        });
      }
    } catch (error: any) {
      logger.error('❌ [audit-purge] Erreur:', error);
      await logAudit({
        action: 'audit_log_purge_failed',
        targetType: 'system',
        status: 'failure',
        metadata: { error: error.message },
      });
    }
  });

  logger.info(
    `✅ [audit-purge] Cron activé (03:15 quotidien, rétention ${retention}j)`
  );
};
