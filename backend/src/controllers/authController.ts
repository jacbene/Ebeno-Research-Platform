// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/knex';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { logAuditFromReq } from '../services/auditLogService';
import { encrypt, decrypt, hashEmail } from '../services/encryptionService';
import { verifyTotpCode, verifyBackupCode } from '../services/totpService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const TWOFA_TEMP_SECRET = JWT_SECRET + '-2fa-pending';   

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateUserId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

// ============================================================
// HELPERS : déchiffrement avec fallback
// ============================================================

const getUserEmail = (user: any): string => {
  if (user.emailEncrypted) {
    const decrypted = decrypt(user.emailEncrypted);
    if (decrypted) return decrypted;
  }
  return user.email || '';
};

const getUserBio = (user: any): string | null => {
  if (user.bioEncrypted) {
    const decrypted = decrypt(user.bioEncrypted);
    if (decrypted) return decrypted;
  }
  return user.bio || null;
};

const getUserInstitution = (user: any): string | null => {
  if (user.institutionEncrypted) {
    const decrypted = decrypt(user.institutionEncrypted);
    if (decrypted) return decrypted;
  }
  return user.institution || null;
};

/**
 * Retourne un objet user "public" avec tous les champs déchiffrés.
 */
const sanitizeUser = (user: any) => ({
  id: user.id,
  email: getUserEmail(user),
  name: user.name,
  role: user.role,
  avatar: user.avatar || null,
  bio: getUserBio(user),
  institution: getUserInstitution(user),
  twoFactorEnabled: !!user.twoFactorEnabled,   // ✅ AJOUTER
});

// ============================================================
// INSCRIPTION
// ============================================================

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, institution } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, mot de passe et nom sont requis' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const emailLower = email.toLowerCase().trim();
    const emailHash = hashEmail(emailLower);

    const existingUser = await db('users').where({ emailHash }).first();
    const existingLegacy = !existingUser
      ? await db('users').where({ email: emailLower }).first()
      : null;

    if (existingUser || existingLegacy) {
      await logAuditFromReq(req, {
        userEmail: emailLower,
        action: 'register_failed',
        targetType: 'user',
        status: 'failure',
        metadata: { reason: 'email_already_used' },
      });
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateUserId();
    const now = new Date().toISOString();

    const emailEncrypted = encrypt(emailLower);
    const institutionTrimmed = institution?.trim() || null;
    const institutionEncrypted = institutionTrimmed ? encrypt(institutionTrimmed) : null;

    await db('users').insert({
      id,
      email: emailLower,
      emailEncrypted,
      emailHash,
      password: hashedPassword,
      name: name.trim(),
      role: 'RESEARCHER',
      isVerified: false,
      institution: institutionTrimmed,                    // compat
      institutionEncrypted,                                // ✅ chiffré
      avatar: null,
      bio: null,
      bioEncrypted: null,
      createdAt: now,
      updatedAt: now,
    });

    const token = jwt.sign(
      { id, email: emailLower, role: 'RESEARCHER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuditFromReq(req, {
      userId: id,
      userEmail: emailLower,
      action: 'register',
      targetType: 'user',
      targetId: id,
      targetName: name.trim(),
      status: 'success',
      metadata: { institution: institutionTrimmed },
    });

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id,
        email: emailLower,
        name: name.trim(),
        role: 'RESEARCHER',
        institution: institutionTrimmed,
        avatar: null,
        bio: null,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur register:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================================
// CONNEXION
// ============================================================

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const emailLower = email.toLowerCase().trim();
    const emailHash = hashEmail(emailLower);

    let user = await db('users').where({ emailHash }).first();
    if (!user) {
      user = await db('users').where({ email: emailLower }).first();
    }

    if (!user) {
      await logAuditFromReq(req, {
        userEmail: emailLower,
        action: 'login_failed',
        targetType: 'user',
        status: 'failure',
        metadata: { reason: 'user_not_found' },
      });
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAuditFromReq(req, {
        userId: user.id,
        userEmail: getUserEmail(user),
        action: 'login_failed',
        targetType: 'user',
        targetId: user.id,
        status: 'failure',
        metadata: { reason: 'invalid_password' },
      });
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // ✅ 2FA : si activée, on renvoie un tempToken (pas le JWT complet)
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { id: user.id, purpose: '2fa-pending' },
        TWOFA_TEMP_SECRET,
        { expiresIn: '5m' }
      );

      await logAuditFromReq(req, {
        userId: user.id,
        userEmail: getUserEmail(user),
        action: 'login_2fa_required',
        targetType: 'user',
        targetId: user.id,
        status: 'success',
      });

      return res.json({
        success: true,
        requires2FA: true,
        tempToken,
        message: '2FA requise',
      });
    }

    // Sinon : JWT complet classique
    const token = jwt.sign(
      { id: user.id, email: getUserEmail(user), role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuditFromReq(req, {
      userId: user.id,
      userEmail: getUserEmail(user),
      action: 'login',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name || getUserEmail(user),
      status: 'success',
    });

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('❌ Erreur login:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};    

// ============================================================
// PROFIL
// ============================================================

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await db('users')
      .select(
        'id', 'email', 'emailEncrypted', 'name', 'role',
        'avatar', 'bio', 'bioEncrypted',
        'institution', 'institutionEncrypted',
        'createdAt'
      )
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json({
      id: user.id,
      email: getUserEmail(user),
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      bio: getUserBio(user),
      institution: getUserInstitution(user),
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('❌ Erreur getProfile:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const getMe = getProfile;

// ============================================================
// MISE À JOUR DU PROFIL
// ============================================================

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const { name, email, bio, institution } = req.body;

    const updates: any = { updatedAt: new Date().toISOString() };

    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }

      const emailLower = email.toLowerCase().trim();
      const newHash = hashEmail(emailLower);

      const existing = await db('users')
        .where({ emailHash: newHash })
        .whereNot({ id: userId })
        .first();
      if (existing) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      updates.email = emailLower;
      updates.emailEncrypted = encrypt(emailLower);
      updates.emailHash = newHash;
    }

    if (name) updates.name = name.trim();

    if (bio !== undefined) {
      const bioTrimmed = bio?.trim() || '';
      updates.bio = bioTrimmed || null;                               // compat
      updates.bioEncrypted = bioTrimmed ? encrypt(bioTrimmed) : null;  // ✅ chiffré
    }

    if (institution !== undefined) {
      const instTrimmed = institution?.trim() || '';
      updates.institution = instTrimmed || null;                                // compat
      updates.institutionEncrypted = instTrimmed ? encrypt(instTrimmed) : null;  // ✅ chiffré
    }

    await db('users').where({ id: userId }).update(updates);

    const updatedUser = await db('users')
      .select(
        'id', 'email', 'emailEncrypted', 'name', 'role',
        'avatar', 'bio', 'bioEncrypted',
        'institution', 'institutionEncrypted',
        'createdAt'
      )
      .where({ id: userId })
      .first();

    await logAuditFromReq(req, {
      userId,
      userEmail: getUserEmail(updatedUser),
      action: 'profile_update',
      targetType: 'user',
      targetId: userId,
      targetName: updatedUser?.name || getUserEmail(updatedUser),
      status: 'success',
      metadata: { fields: Object.keys(req.body) },
    });

    return res.json({
      success: true,
      message: 'Profil mis à jour',
      user: {
        id: updatedUser.id,
        email: getUserEmail(updatedUser),
        name: updatedUser.name,
        role: updatedUser.role,
        avatar: updatedUser.avatar,
        bio: getUserBio(updatedUser),
        institution: getUserInstitution(updatedUser),
        createdAt: updatedUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur updateProfile:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================================
// CHANGEMENT DE MOT DE PASSE
// ============================================================

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mot de passe actuel et nouveau requis' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit être différent de l\'actuel' });
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      await logAuditFromReq(req, {
        userId,
        userEmail: getUserEmail(user),
        action: 'password_change_failed',
        targetType: 'user',
        targetId: userId,
        status: 'failure',
        metadata: { reason: 'invalid_current_password' },
      });
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users')
      .where({ id: userId })
      .update({ password: hashedPassword, updatedAt: new Date().toISOString() });

    await logAuditFromReq(req, {
      userId,
      userEmail: getUserEmail(user),
      action: 'password_change',
      targetType: 'user',
      targetId: userId,
      targetName: user.name || getUserEmail(user),
      status: 'success',
    });

    return res.json({ success: true, message: 'Mot de passe changé avec succès' });
  } catch (error: any) {
    console.error('❌ Erreur changePassword:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================================
// UPLOAD D'AVATAR
// ============================================================

export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: 'Non authentifié' });

    const file = (req as any).file;
    if (!file) return res.status(400).json({ message: 'Aucun fichier' });

    const { publicId, secureUrl } = await uploadToCloudinary(
      file.path,
      `avatars/${userId}`,
      'image'
    );

    await db('users')
      .where({ id: userId })
      .update({ avatar: secureUrl, updatedAt: new Date().toISOString() });

    await logAuditFromReq(req, {
      userId,
      action: 'avatar_update',
      targetType: 'user',
      targetId: userId,
      status: 'success',
      metadata: { size: file.size, mimeType: file.mimetype },
    });

    return res.json({
      success: true,
      message: 'Avatar mis à jour',
      avatar: secureUrl,
    });
  } catch (error: any) {
    console.error('❌ Erreur uploadAvatar:', error);
    return res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// ============================================================
// 2FA : VÉRIFICATION DU CODE AU LOGIN
// ============================================================

/**
 * POST /api/auth/2fa-login
 * Body : { tempToken, code, useBackupCode?: boolean }
 * Vérifie le tempToken + le code TOTP (ou backup code),
 * puis retourne le JWT complet.
 */
export const verify2FALogin = async (req: Request, res: Response) => {
  try {
    const { tempToken, code, useBackupCode } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ message: 'tempToken et code requis' });
    }

    // 1. Vérifier le tempToken
    let payload: any;
    try {
      payload = jwt.verify(tempToken, TWOFA_TEMP_SECRET);
    } catch (err: any) {
      return res.status(401).json({ message: 'Session 2FA expirée. Reconnectez-vous.' });
    }

    if (payload.purpose !== '2fa-pending') {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const userId = payload.id;

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA désactivée' });
    }

    // 2. Vérifier le code : TOTP ou backup code
    let isValid = false;

    if (useBackupCode) {
      const result = await verifyBackupCode(code, user.twoFactorBackupCodes);
      if (result.valid) {
        isValid = true;
        // Consommer le backup code
        await db('users').where({ id: userId }).update({
          twoFactorBackupCodes: JSON.stringify(result.remainingHashes),
          updatedAt: new Date().toISOString(),
        });
      }
    } else {
      isValid = verifyTotpCode(code, user.twoFactorSecretEncrypted);
    }

    if (!isValid) {
      await logAuditFromReq(req, {
        userId,
        userEmail: getUserEmail(user),
        action: 'login_2fa_failed',
        targetType: 'user',
        targetId: userId,
        status: 'failure',
        metadata: { reason: useBackupCode ? 'invalid_backup_code' : 'invalid_totp' },
      });
      return res.status(401).json({ message: 'Code invalide' });
    }

    // 3. Succès : générer le JWT complet
    const token = jwt.sign(
      { id: user.id, email: getUserEmail(user), role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await logAuditFromReq(req, {
      userId: user.id,
      userEmail: getUserEmail(user),
      action: useBackupCode ? 'login_2fa_backup' : 'login_2fa',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name || getUserEmail(user),
      status: 'success',
    });

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error: any) {
    console.error('❌ Erreur verify2FALogin:', error);
    return res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ============================================================
// DÉCONNEXION
// ============================================================

export const logout = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const userEmail = (req as any).user?.email;

  if (userId) {
    await logAuditFromReq(req, {
      userId,
      userEmail,
      action: 'logout',
      targetType: 'user',
      targetId: userId,
      status: 'success',
    });
  }

  res.json({ success: true, message: 'Déconnexion réussie' });
};
