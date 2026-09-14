// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/knex';
import { uploadToCloudinary } from '../services/cloudinaryService';

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// ============================================================
// UTILITAIRES
// ============================================================

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const generateUserId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
};

// ============================================================
// INSCRIPTION
// ============================================================

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, institution } = req.body;

    // Validations
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, mot de passe et nom sont requis' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Format d\'email invalide' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db('users').where({ email: email.toLowerCase() }).first();
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    // Créer l'utilisateur
    const hashedPassword = await bcrypt.hash(password, 10);
    const id = generateUserId();
    const now = new Date().toISOString();

    await db('users').insert({
      id,
      email: email.toLowerCase(),
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

    // Générer le token directement pour auto-login
    const token = jwt.sign(
      { id, email: email.toLowerCase(), role: 'RESEARCHER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      token,
      user: {
        id,
        email: email.toLowerCase(),
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

    const user = await db('users').where({ email: email.toLowerCase() }).first();
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
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
// PROFIL (alias de getMe)
// ============================================================

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const user = await db('users')
      .select('id', 'email', 'name', 'role', 'avatar', 'bio', 'institution', 'createdAt')
      .where({ id: userId })
      .first();

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json(user);
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

    // Validations
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Format d\'email invalide' });
      }
      const existing = await db('users')
        .where({ email: email.toLowerCase() })
        .whereNot({ id: userId })
        .first();
      if (existing) {
        return res.status(400).json({ message: 'Cet email est déjà utilisé' });
      }
    }

    const updates: any = { updatedAt: new Date().toISOString() };
    if (name) updates.name = name.trim();
    if (email) updates.email = email.toLowerCase();
    if (bio !== undefined) updates.bio = bio?.trim() || null;
    if (institution !== undefined) updates.institution = institution?.trim() || null;

    await db('users').where({ id: userId }).update(updates);

    const updatedUser = await db('users')
      .select('id', 'email', 'name', 'role', 'avatar', 'bio', 'institution', 'createdAt')
      .where({ id: userId })
      .first();

    return res.json({
      success: true,
      message: 'Profil mis à jour',
      user: updatedUser,
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
      return res.status(401).json({ message: 'Mot de passe actuel incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db('users')
      .where({ id: userId })
      .update({ password: hashedPassword, updatedAt: new Date().toISOString() });

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

    // Upload vers Cloudinary (dossier avatars)
    const { publicId, secureUrl } = await uploadToCloudinary(
      file.path,
      `avatars/${userId}`,
      'image'
    );

    // Mettre à jour l'utilisateur
    await db('users')
      .where({ id: userId })
      .update({ avatar: secureUrl, updatedAt: new Date().toISOString() });

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
  res.json({ success: true, message: 'Déconnexion réussie' });
};
