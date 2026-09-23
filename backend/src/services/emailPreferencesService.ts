// backend/src/services/emailPreferencesService.ts
import { db } from '../db/knex';
import { logger } from '../utils/logger';

export type NotificationType =
  | 'projectMemberAdded'
  | 'transcriptionComplete'
  | 'summaryReady';

/** ✅ Emails TRANSACTIONNELS — toujours envoyés, jamais désactivables */
export const TRANSACTIONAL_EMAILS = new Set([
  'verification',       // vérification d'inscription
  'passwordReset',      // reset mdp
  'emailChange',        // changement d'email
  'security',           // alertes sécurité
]);

/** ✅ Emails de CONFORT — respectent les préférences utilisateur */
export const OPTIONAL_EMAILS: Record<NotificationType, string> = {
  projectMemberAdded: 'notifyProjectMemberAdded',
  transcriptionComplete: 'notifyTranscriptionComplete',
  summaryReady: 'notifySummaryReady',
};

export interface EmailPreferences {
  projectMemberAdded: boolean;
  transcriptionComplete: boolean;
  summaryReady: boolean;
}

export const DEFAULT_PREFERENCES: EmailPreferences = {
  projectMemberAdded: true,
  transcriptionComplete: true,
  summaryReady: true,
};

/**
 * Récupère les préférences email d'un utilisateur.
 * Retourne les défauts si la colonne est null (utilisateurs pré-migration).
 */
export const getUserEmailPreferences = async (
  userId: string
): Promise<EmailPreferences> => {
  const row = await db('users')
    .where({ id: userId })
    .select(
      'notifyProjectMemberAdded',
      'notifyTranscriptionComplete',
      'notifySummaryReady'
    )
    .first();

  if (!row) return DEFAULT_PREFERENCES;

  return {
    projectMemberAdded: row.notifyProjectMemberAdded !== false,
    transcriptionComplete: row.notifyTranscriptionComplete !== false,
    summaryReady: row.notifySummaryReady !== false,
  };
};

/**
 * Vérifie si un utilisateur accepte un type de notification.
 * Les emails transactionnels passent toujours.
 */
export const canSendEmail = async (
  userId: string,
  type: NotificationType
): Promise<boolean> => {
  try {
    const prefs = await getUserEmailPreferences(userId);
    return prefs[type] !== false;
  } catch (err: any) {
    logger.warn(`⚠️ [email-prefs] Erreur lecture prefs ${userId}: ${err.message}`);
    return true; // Fail-open : mieux vaut envoyer que rater
  }
};

/**
 * Met à jour les préférences email d'un utilisateur.
 */
export const updateEmailPreferences = async (
  userId: string,
  prefs: Partial<EmailPreferences>
): Promise<void> => {
  const update: Record<string, any> = { updatedAt: new Date().toISOString() };

  if (prefs.projectMemberAdded !== undefined) {
    update.notifyProjectMemberAdded = prefs.projectMemberAdded;
  }
  if (prefs.transcriptionComplete !== undefined) {
    update.notifyTranscriptionComplete = prefs.transcriptionComplete;
  }
  if (prefs.summaryReady !== undefined) {
    update.notifySummaryReady = prefs.summaryReady;
  }

  await db('users').where({ id: userId }).update(update);
  logger.info(`✅ [email-prefs] Prefs mises à jour pour ${userId}`, update);
};
