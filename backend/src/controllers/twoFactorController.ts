// backend/src/controllers/twoFactorController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { logAuditFromReq } from '../services/auditLogService';
import {
  generateTotpSetup,
  verifyTotpCode,
  generateBackupCodes,
  encryptSecret,
} from '../services/totpService';

// ============================================================
// SETUP : générer secret + QR (2FA pas encore activé)
// ============================================================

/**
 * POST /api/2fa/setup
 * Génère un nouveau secret TOTP + QR code.
 * Le secret est stocké chiffré, mais 2FA pas encore activé.
 * L'utilisateur doit confirmer avec un code pour activer.
 */
export const setup2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        message: 'La 2FA est déjà activée. Désactivez-la d\'abord pour la reconfigurer.',
      });
    }

    // Générer secret + QR
    const { secret, qrCodeDataUrl } = await generateTotpSetup(userEmail || user.email);

    // Stocker le secret chiffré (remplace tout ancien secret non confirmé)
    await db('users').where({ id: userId }).update({
      twoFactorSecretEncrypted: encryptSecret(secret),
      updatedAt: new Date().toISOString(),
    });

    await logAuditFromReq(req, {
      userId,
      userEmail: userEmail || user.email,
      action: '2fa_setup_started',
      targetType: 'user',
      targetId: userId,
      status: 'success',
    });

    return res.json({
      success: true,
      message: 'Scannez le QR code avec votre application TOTP',
      data: {
        qrCodeDataUrl,
        secret, // pour saisie manuelle si le scan échoue
      },
    });
  } catch (error: any) {
    logger.error('❌ [2FA] Erreur setup:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// ENABLE : valider le premier code + activer 2FA
// ============================================================

/**
 * POST /api/2fa/enable
 * Body : { code: '123456' }
 * Valide le code, active la 2FA et génère 10 backup codes.
 */
export const enable2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code requis' });

    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'La 2FA est déjà activée' });
    }

    if (!user.twoFactorSecretEncrypted) {
      return res.status(400).json({
        success: false,
        message: 'Aucun secret TOTP. Lancez d\'abord /api/2fa/setup',
      });
    }

    // Vérifier le code
    const isValid = verifyTotpCode(code, user.twoFactorSecretEncrypted);
    if (!isValid) {
      await logAuditFromReq(req, {
        userId,
        userEmail,
        action: '2fa_enable_failed',
        targetType: 'user',
        targetId: userId,
        status: 'failure',
        metadata: { reason: 'invalid_code' },
      });
      return res.status(400).json({ success: false, message: 'Code invalide ou expiré' });
    }

    // Générer 10 backup codes
    const { codes, hashedJson } = await generateBackupCodes();

    // Activer 2FA
    await db('users').where({ id: userId }).update({
      twoFactorEnabled: true,
      twoFactorBackupCodes: hashedJson,
      twoFactorEnabledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await logAuditFromReq(req, {
      userId,
      userEmail,
      action: '2fa_enabled',
      targetType: 'user',
      targetId: userId,
      status: 'success',
    });

    return res.json({
      success: true,
      message: '2FA activée avec succès',
      data: {
        backupCodes: codes, // ⚠️ À afficher UNE SEULE FOIS
        warning: 'Conservez ces codes dans un endroit sûr. Ils ne seront plus jamais affichés.',
      },
    });
  } catch (error: any) {
    logger.error('❌ [2FA] Erreur enable:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// DISABLE : désactiver (nécessite mot de passe)
// ============================================================

/**
 * POST /api/2fa/disable
 * Body : { password: 'xxx' }
 */
export const disable2FA = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Mot de passe requis' });

    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'La 2FA n\'est pas activée' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAuditFromReq(req, {
        userId,
        userEmail,
        action: '2fa_disable_failed',
        targetType: 'user',
        targetId: userId,
        status: 'failure',
        metadata: { reason: 'invalid_password' },
      });
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }

    await db('users').where({ id: userId }).update({
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      twoFactorBackupCodes: null,
      twoFactorEnabledAt: null,
      updatedAt: new Date().toISOString(),
    });

    await logAuditFromReq(req, {
      userId,
      userEmail,
      action: '2fa_disabled',
      targetType: 'user',
      targetId: userId,
      status: 'success',
    });

    return res.json({ success: true, message: '2FA désactivée' });
  } catch (error: any) {
    logger.error('❌ [2FA] Erreur disable:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// STATUS : état actuel
// ============================================================

/**
 * GET /api/2fa/status
 */
export const get2FAStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const user = await db('users')
      .where({ id: userId })
      .select('twoFactorEnabled', 'twoFactorEnabledAt', 'twoFactorBackupCodes')
      .first();

    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    let backupCodesRemaining = 0;
    if (user.twoFactorBackupCodes) {
      try {
        const arr = JSON.parse(user.twoFactorBackupCodes);
        backupCodesRemaining = Array.isArray(arr) ? arr.length : 0;
      } catch {}
    }

    return res.json({
      success: true,
      data: {
        enabled: !!user.twoFactorEnabled,
        enabledAt: user.twoFactorEnabledAt || null,
        backupCodesRemaining,
      },
    });
  } catch (error: any) {
    logger.error('❌ [2FA] Erreur status:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
// REGENERATE : nouveaux backup codes (nécessite mot de passe)
// ============================================================

/**
 * POST /api/2fa/backup-codes/regenerate
 * Body : { password: 'xxx' }
 */
export const regenerateBackupCodes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Mot de passe requis' });

    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ success: false, message: 'La 2FA n\'est pas activée' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }

    const { codes, hashedJson } = await generateBackupCodes();

    await db('users').where({ id: userId }).update({
      twoFactorBackupCodes: hashedJson,
      updatedAt: new Date().toISOString(),
    });

    await logAuditFromReq(req, {
      userId,
      userEmail,
      action: '2fa_backup_codes_regenerated',
      targetType: 'user',
      targetId: userId,
      status: 'success',
    });

    return res.json({
      success: true,
      message: 'Nouveaux codes générés',
      data: {
        backupCodes: codes,
        warning: 'Les anciens codes ne fonctionnent plus.',
      },
    });
  } catch (error: any) {
    logger.error('❌ [2FA] Erreur regenerate:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
