// backend/src/services/passwordResetService.ts
import crypto from 'crypto';
import { db } from '../db/knex';
import { encrypt, decrypt } from './encryptionService';
import { logger } from '../utils/logger';

const TOKEN_LENGTH = 32;
const TOKEN_TTL_HOURS = 1; // ✅ Plus court que la vérification email (1h)

export const generateResetToken = (): string => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

export const createPasswordResetToken = async (userId: string): Promise<string> => {
  const token = generateResetToken();
  const tokenEncrypted = encrypt(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db('users').where({ id: userId }).update({
    passwordResetToken: tokenEncrypted,
    passwordResetExpiresAt: expiresAt.toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return token;
};

export const verifyPasswordResetToken = async (token: string): Promise<string | null> => {
  if (!token || token.length !== TOKEN_LENGTH * 2) return null;

  const now = new Date().toISOString();

  const candidates = await db('users')
    .whereNotNull('passwordResetToken')
    .where('passwordResetExpiresAt', '>', now)
    .select('id', 'passwordResetToken');

  for (const candidate of candidates) {
    const decrypted = decrypt(candidate.passwordResetToken);
    if (decrypted && decrypted === token) {
      return candidate.id;
    }
  }

  return null;
};

export const clearPasswordResetToken = async (userId: string): Promise<void> => {
  await db('users').where({ id: userId }).update({
    passwordResetToken: null,
    passwordResetExpiresAt: null,
    updatedAt: new Date().toISOString(),
  });
  logger.info(`✅ [password-reset] Token effacé pour user ${userId}`);
};

export const cleanupExpiredResetTokens = async (): Promise<number> => {
  const now = new Date().toISOString();
  const count = await db('users')
    .whereNotNull('passwordResetToken')
    .where('passwordResetExpiresAt', '<', now)
    .update({ passwordResetToken: null, passwordResetExpiresAt: null });
  if (count > 0) logger.info(`🧹 [password-reset] ${count} token(s) expiré(s) nettoyé(s)`);
  return count;
};
