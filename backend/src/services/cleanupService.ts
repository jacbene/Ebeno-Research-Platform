// backend/src/services/cleanupService.ts
import cron from 'node-cron';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

const RETENTION_DAYS = 90;

/**
 * Supprime les activités de plus de 90 jours
 */
export const purgeOldActivities = async (): Promise<number> => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    const deleted = await db('project_activity')
      .where('createdAt', '<', cutoff.toISOString())
      .delete();

    if (deleted > 0) {
      logger.info(`🧹 Purge automatique : ${deleted} activité(s) supprimée(s) (>${RETENTION_DAYS}j)`);
    } else {
      logger.debug('🧹 Purge automatique : aucune activité à supprimer');
    }

    return deleted;
  } catch (error: any) {
    logger.error('❌ Erreur purge activités:', { error: error.message });
    return 0;
  }
};

/**
 * Démarre le cron de purge (tous les jours à 3h du matin)
 */
export const startCleanupCron = () => {
  // Cron : tous les jours à 03:00
  cron.schedule('0 3 * * *', async () => {
    logger.info('🧹 [cron] Démarrage de la purge quotidienne...');
    await purgeOldActivities();
  });

  logger.info('✅ [cleanup] Cron de purge activé (03:00 quotidien, rétention 90j)');
};
