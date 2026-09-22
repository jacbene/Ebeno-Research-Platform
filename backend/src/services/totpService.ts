// backend/src/services/totpService.ts
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { encrypt, decrypt } from './encryptionService';
import { logger } from '../utils/logger';

const APP_NAME = 'Ebeno Research';
const BACKUP_CODES_COUNT = 10;

// Configuration : 30s de validité, tolérance ±1 fenêtre (60s)
authenticator.options = {
  window: 1,
  step: 30,
};

// ============================================================
// GÉNÉRATION DU SECRET + QR CODE
// ============================================================

export interface TotpSetup {
  secret: string;              // Base32 (à chiffrer avant stockage)
  qrCodeDataUrl: string;       // Data URL de l'image PNG
  otpauthUrl: string;          // URL otpauth:// pour usage manuel
}

export const generateTotpSetup = async (
  userEmail: string
): Promise<TotpSetup> => {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(userEmail, APP_NAME, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

  return { secret, qrCodeDataUrl, otpauthUrl };
};

// ============================================================
// VÉRIFICATION D'UN CODE
// ============================================================

export const verifyTotpCode = (
  code: string,
  secretEncrypted: string | null
): boolean => {
  if (!code || !secretEncrypted) return false;

  const secret = decrypt(secretEncrypted);
  if (!secret) {
    logger.warn('⚠️ [2FA] Échec déchiffrement secret');
    return false;
  }

  // Nettoyer le code (retirer espaces éventuels)
  const cleanCode = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  try {
    return authenticator.verify({ token: cleanCode, secret });
  } catch (error: any) {
    logger.warn(`⚠️ [2FA] Erreur vérification : ${error.message}`);
    return false;
  }
};

// ============================================================
// BACKUP CODES
// ============================================================

/**
 * Génère 10 codes de secours à 10 chars chacun.
 * Retourne : { codes: [...], hashed: [...] }
 * - codes : à afficher une seule fois à l'utilisateur
 * - hashed : à stocker en DB (JSON stringifié)
 */
export const generateBackupCodes = async (): Promise<{
  codes: string[];
  hashedJson: string;
}> => {
  const codes: string[] = [];

  for (let i = 0; i < BACKUP_CODES_COUNT; i++) {
    // Format : "XXXX-XXXX" (8 chars en 2 blocs)
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase().substring(0, 8);
    codes.push(`${raw.substring(0, 4)}-${raw.substring(4, 8)}`);
  }

  // Hash chacun (bcrypt coûteux mais backup codes vérifiés rarement)
  const hashed = await Promise.all(
    codes.map((c) => bcrypt.hash(c.replace(/-/g, ''), 10))
  );

  return {
    codes,
    hashedJson: JSON.stringify(hashed),
  };
};

/**
 * Vérifie un backup code et retourne le nouvel index du tableau si valide.
 * Retourne :
 *  - { valid: false } si invalide
 *  - { valid: true, remainingHashes: [...] } si valide (code consommé)
 */
export const verifyBackupCode = async (
  code: string,
  hashedJson: string | null
): Promise<{ valid: false } | { valid: true; remainingHashes: string[] }> => {
  if (!code || !hashedJson) return { valid: false };

  let hashes: string[];
  try {
    hashes = JSON.parse(hashedJson);
  } catch {
    return { valid: false };
  }

  const cleanCode = code.replace(/[-\s]/g, '').toUpperCase();

  for (let i = 0; i < hashes.length; i++) {
    const match = await bcrypt.compare(cleanCode, hashes[i]);
    if (match) {
      // Consommer ce code (le retirer de la liste)
      const remaining = [...hashes.slice(0, i), ...hashes.slice(i + 1)];
      return { valid: true, remainingHashes: remaining };
    }
  }

  return { valid: false };
};

// ============================================================
// HELPERS
// ============================================================

export const encryptSecret = (secret: string): string => encrypt(secret);

export const decryptSecret = (encrypted: string): string => decrypt(encrypted);
