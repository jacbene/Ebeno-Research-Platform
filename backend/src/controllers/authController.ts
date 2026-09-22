// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/knex';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { logAuditFromReq } from '../services/auditLogService';
import { encrypt, decrypt, hashEmail } from '../services/encryptionService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateUserId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

// ✅ Helper : déchiffre l'email d'un user (fallback sur email en clair)
const getUserEmail = (user: any): string => {
  if (user.emailEncrypted) {
    const decrypted = decrypt(user.emailEncrypted);
    if (decrypted) return decrypted;
  }
  return user.email || '';
};

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

    // ✅ Recherche par hash (déterministe)
    const existingUser = await db('users').where({ emailHash }).first();
    // Fallback : chercher aussi par email en clair (compat anciens users)
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

    await db('users').insert({
      id,
      email: emailLower,              // ⚠️ gardé en clair pour transition
      emailEncrypted,                 // ✅ chiffré
      emailHash,                      // ✅ hash pour recherche
      password: hashedPassword,
      name: name.trim(),
      role: 'RESEARCHER',
      isVerified: false,
      institution: institution?.trim() || null,
      avatar: null,
      bio: null,
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
      metadata: { institution: institution?.trim() || null },
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
        institution: institution?.trim() || null,
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

    // ✅ Recherche par hash (nouveau) + fallback email clair (compat)
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
      user: {
        id: user.id,
        email: getUserEmail(user),
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
        bio: user.bio || null,
        institution: user.institution || null,
      },
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
      .select('id', 'email', 'emailEncrypted', 'name', 'role', 'avatar', 'bio', 'institution', 'createdAt')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // ✅ Déchiffrer l'email
    const { emailEncrypted, ...userData } = user;
    return res.json({
      ...userData,
      email: getUserEmail(user),
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

      // Vérifier qu'aucun autre user n'a ce hash
      const existing = await db('users')
        .where({ emailHash: newHash })
        .whereNot({ id: userId })
        .first();
      if (existing) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }

      updates.email = emailLower;                       // compat
      updates.emailEncrypted = encrypt(emailLower);    // ✅ chiffré
      updates.emailHash = newHash;                     // ✅ hash
    }

    if (name) updates.name = name.trim();
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (institution !== undefined) updates.institution = institution?.trim() || null;

    await db('users').where({ id: userId }).update(updates);

    const updatedUser = await db('users')
      .select('id', 'email', 'emailEncrypted', 'name', 'role', 'avatar', 'bio', 'institution', 'createdAt')
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

    const { emailEncrypted: _, ...cleanUser } = updatedUser as any;
    return res.json({
      success: true,
      message: 'Profil mis à jour',
      user: {
        ...cleanUser,
        email: getUserEmail(updatedUser),
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
