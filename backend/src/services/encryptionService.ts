// backend/src/services/encryptionService.ts
import crypto from 'crypto';

// ⚠️ Ces clés sont chargées depuis les variables d'env
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '';
const EMAIL_PEPPER = process.env.EMAIL_HASH_PEPPER || '';

// Vérification au démarrage
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
  console.error('❌ ENCRYPTION_KEY manquante ou invalide (doit faire 64 chars hex)');
}
if (!EMAIL_PEPPER || EMAIL_PEPPER.length < 32) {
  console.error('❌ EMAIL_HASH_PEPPER manquant ou trop court (min 32 chars)');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

// ============================================================
// CHIFFREMENT / DÉCHIFFREMENT (AES-256-GCM)
// ============================================================

/**
 * Chiffre une string.
 * Format de sortie : "iv:authTag:encrypted" (tout en hex).
 */
export const encrypt = (text: string): string => {
  if (!text) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Déchiffre une string chiffrée par `encrypt()`.
 * Retourne '' si invalide.
 */
export const decrypt = (encryptedText: string): string => {
  if (!encryptedText) return '';

  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Format de chiffrement invalide');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error: any) {
    console.error('❌ Erreur déchiffrement:', error.message);
    return '';
  }
};

// ============================================================
// HASH DÉTERMINISTE (pour recherche)
// ============================================================

/**
 * Calcule un hash SHA-256 déterministe d'un email.
 * Utilisé pour la recherche au login (impossible avec AES-GCM car IV aléatoire).
 *
 * ⚠️ Le pepper est nécessaire pour éviter les attaques par rainbow table.
 */
export const hashEmail = (email: string): string => {
  if (!email) return '';
  const normalized = email.toLowerCase().trim();
  return crypto
    .createHmac('sha256', EMAIL_PEPPER)
    .update(normalized)
    .digest('hex');
};

/**
 * Vérifie qu'un email correspond à un hash.
 */
export const verifyEmailHash = (email: string, hash: string): boolean => {
  if (!email || !hash) return false;
  const computed = hashEmail(email);
  // Comparaison à temps constant pour éviter les timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(hash, 'hex')
  );
};
