// backend/src/services/emailVerificationService.ts
import crypto from 'crypto';
import { db } from '../db/knex';
import { encrypt, decrypt } from './encryptionService';
import { logger } from '../utils/logger';

const TOKEN_LENGTH = 32;
const TOKEN_TTL_HOURS = 24;

export const generateVerificationToken = (): string => {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
};

export const createVerificationToken = async (userId: string): Promise<string> => {
  const token = generateVerificationToken();
  const tokenEncrypted = encrypt(token);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);

  await db('users').where({ id: userId }).update({
    emailVerificationToken: tokenEncrypted,
    emailVerificationExpiresAt: expiresAt.toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return token;
};

export const verifyEmailToken = async (token: string): Promise<string | null> => {
  if (!token || token.length !== TOKEN_LENGTH * 2) return null;

  const now = new Date().toISOString();

  const candidates = await db('users')
    .whereNotNull('emailVerificationToken')
    .where('emailVerificationExpiresAt', '>', now)
    .select('id', 'emailVerificationToken');

  for (const candidate of candidates) {
    const decrypted = decrypt(candidate.emailVerificationToken);
    if (decrypted && decrypted === token) {
      return candidate.id;
    }
  }

  return null;
};

export const markEmailVerified = async (userId: string): Promise<void> => {
  await db('users').where({ id: userId }).update({
    isVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    updatedAt: new Date().toISOString(),
  });
  logger.info(`✅ [verification] User ${userId} vérifié`);
};

export const cleanupExpiredVerificationTokens = async (): Promise<number> => {
  const now = new Date().toISOString();
  const count = await db('users')
    .whereNotNull('emailVerificationToken')
    .where('emailVerificationExpiresAt', '<', now)
    .update({ emailVerificationToken: null, emailVerificationExpiresAt: null });
  if (count > 0) logger.info(`🧹 [verification] ${count} token(s) expiré(s) nettoyé(s)`);
  return count;
};
