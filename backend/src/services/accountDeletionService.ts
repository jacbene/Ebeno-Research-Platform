// backend/src/services/accountDeletionService.ts
import crypto from 'crypto';
import cron from 'node-cron';   
import { db } from '../db/knex';
import { encrypt, decrypt } from './encryptionService';
import { logger } from '../utils/logger';
import { deleteFromCloudinary } from './cloudinaryService';

const TOKEN_LENGTH = 32;
const GRACE_PERIOD_DAYS = 30;

// ============================================================
// DEMANDER LA SUPPRESSION
// ============================================================
export const requestAccountDeletion = async (
  userId: string,
  reason?: string
): Promise<{ token: string; scheduledFor: string }> => {
  const token = crypto.randomBytes(TOKEN_LENGTH).toString('hex');
  const tokenEncrypted = encrypt(token);
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  await db('users').where({ id: userId }).update({
    deletionRequestedAt: now.toISOString(),
    deletionScheduledFor: scheduledFor.toISOString(),
    deletionToken: tokenEncrypted,
    deletionReason: reason || null,
    updatedAt: now.toISOString(),
  });

  logger.info(`🗑️ [account-deletion] Suppression demandée pour ${userId}, prévue le ${scheduledFor.toISOString()}`);

  return {
    token,
    scheduledFor: scheduledFor.toISOString(),
  };
};

// ============================================================
// ANNULER LA SUPPRESSION (via token email)
// ============================================================
export const cancelAccountDeletion = async (token: string): Promise<string | null> => {
  if (!token || token.length !== TOKEN_LENGTH * 2) return null;

  const candidates = await db('users')
    .whereNotNull('deletionToken')
    .select('id', 'deletionToken');

  for (const candidate of candidates) {
    const decrypted = decrypt(candidate.deletionToken);
    if (decrypted && decrypted === token) {
      await db('users').where({ id: candidate.id }).update({
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        deletionToken: null,
        deletionReason: null,
        updatedAt: new Date().toISOString(),
      });
      logger.info(`✅ [account-deletion] Suppression annulée pour ${candidate.id}`);
      return candidate.id;
    }
  }

  return null;
};

// ============================================================
// SUPPRESSION DÉFINITIVE (cascade complète)
// ============================================================
export const permanentlyDeleteAccount = async (userId: string): Promise<void> => {
  logger.warn(`💥 [account-deletion] Suppression DÉFINITIVE de ${userId} — début`);

  // 1. Récupérer toutes les données à nettoyer
  const user = await db('users').where({ id: userId }).first();
  if (!user) {
    logger.warn(`⚠️ [account-deletion] User ${userId} introuvable`);
    return;
  }

  // 2. Récupérer les projets de l'utilisateur (owner)
  const ownedProjects = await db('projects').where({ userId }).select('id');
  const projectIds = ownedProjects.map((p: any) => p.id);

  // 3. Récupérer les fichiers Cloudinary liés
  const files = await db('project_files')
    .whereIn('projectId', projectIds.length ? projectIds : ['__none__'])
    .orWhere({ userId })
    .select('id', 'cloudinaryPublicId');

  // Supprimer les fichiers Cloudinary
  for (const file of files) {
    if (file.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(file.cloudinaryPublicId);
      } catch (err: any) {
        logger.warn(`⚠️ [account-deletion] Cloudinary delete failed ${file.cloudinaryPublicId}: ${err.message}`);
      }
    }
  }

  // Supprimer l'avatar Cloudinary si présent
  if (user.avatar && user.avatar.includes('cloudinary')) {
    try {
      const match = user.avatar.match(/\/([^/]+)\.[a-z]+$/i);
      if (match) {
        await deleteFromCloudinary(`avatars/${userId}/${match[1]}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [account-deletion] Avatar delete failed: ${err.message}`);
    }
  }

  // 4. Suppression cascade en transaction
  await db.transaction(async (trx) => {
    // Fichiers projets
    await trx('project_files').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();
    await trx('project_files').where({ userId }).delete();

    // Transcriptions
    await trx('transcriptions').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();
    await trx('transcriptions').where({ userId }).delete();

    // Memos
    await trx('memos').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();
    await trx('memos').where({ userId }).delete();

    // Documents collaboratifs
    await trx('collaboration_documents').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();

    // Project members
    await trx('project_members').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();
    await trx('project_members').where({ userId }).delete();

    // Project activity
    await trx('project_activity').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();
    await trx('project_activity').where({ userId }).delete();

    // Project tags
    await trx('project_tags').whereIn('projectId', projectIds.length ? projectIds : ['__none__']).delete();

    // Projects
    await trx('projects').where({ userId }).delete();

    // Summaries + entities liés à l'utilisateur
    await trx('document_summaries').where({ userId }).delete();
    await trx('document_entities').where({ userId }).delete();

    // Suggestions de codes
    await trx('suggested_codes').where({ userId }).delete();

    // Audit log : ANONYMISER au lieu de supprimer (obligation légale de conservation)
    await trx('audit_log').where({ userId }).update({
      userId: null,
      userEmail: null,
      ipAddress: null,
      userAgent: null,
      metadata: JSON.stringify({ anonymized: true, deletedAt: new Date().toISOString() }),
    });

    // Enfin : supprimer l'utilisateur
    await trx('users').where({ id: userId }).delete();
  });

  logger.warn(`💥 [account-deletion] Suppression DÉFINITIVE de ${userId} — terminée`);
};

// ============================================================
// PURGE AUTOMATIQUE (cron quotidien)
// ============================================================
export const purgeDeletedAccounts = async (): Promise<number> => {
  const now = new Date().toISOString();
  const expired = await db('users')
    .whereNotNull('deletionScheduledFor')
    .where('deletionScheduledFor', '<', now)
    .select('id');

  if (expired.length === 0) {
    logger.info('🧹 [account-deletion] Aucun compte à purger');
    return 0;
  }

  let count = 0;
  for (const user of expired) {
    try {
      await permanentlyDeleteAccount(user.id);
      count++;
    } catch (err: any) {
      logger.error(`❌ [account-deletion] Échec purge ${user.id}: ${err.message}`);
    }
  }

  logger.info(`🧹 [account-deletion] ${count} compte(s) purgé(s)`);
  return count;
};

// ============================================================
// ✅ CRON DE PURGE AUTOMATIQUE (03:30 quotidien)
// ============================================================

export const startAccountDeletionPurgeCron = (): void => {
  // ⏰ Tous les jours à 03:30
  cron.schedule('30 3 * * *', async () => {
    logger.info('🗑️ [account-deletion-cron] Démarrage de la purge...');
    try {
      const count = await purgeDeletedAccounts();
      logger.info(`✅ [account-deletion-cron] Purge terminée (${count} compte(s))`);
    } catch (err: any) {
      logger.error(`❌ [account-deletion-cron] Erreur: ${err.message}`);
    }
  });

  logger.info('✅ [account-deletion-cron] Cron activé (03:30 quotidien, délai 30j)');
};

export const GRACE_PERIOD = GRACE_PERIOD_DAYS;
