// backend/src/controllers/languageController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  SUPPORTED_LANGUAGES,
  isValidLanguage,
  normalizeLanguage,
} from '../services/languageService';

/**
 * GET /api/language/supported
 * Retourne la liste des langues supportées (utile pour le frontend).
 */
export const getSupportedLanguages = (req: Request, res: Response) => {
  res.json({
    success: true,
    data: SUPPORTED_LANGUAGES,
  });
};

/**
 * GET /api/language/me
 * Retourne la langue actuelle de l'utilisateur.
 */
export const getMyLanguage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const user = await db('users').where({ id: userId }).select('language').first();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({
      success: true,
      data: { language: normalizeLanguage(user.language) },
    });
  } catch (error: any) {
    logger.error('❌ getMyLanguage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

/**
 * PUT /api/language/me
 * Met à jour la langue de l'utilisateur.
 * Body : { language: 'fr' | 'en' | 'es' | 'pt' | 'ar' }
 */
export const updateMyLanguage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { language } = req.body;

    if (!isValidLanguage(language)) {
      return res.status(400).json({
        success: false,
        message: `Langue non supportée. Valeurs acceptées : ${SUPPORTED_LANGUAGES.map((l) => l.code).join(', ')}`,
      });
    }

    await db('users')
      .where({ id: userId })
      .update({
        language,
        updatedAt: new Date().toISOString(),
      });

    logger.info(`🌍 Langue mise à jour pour user ${userId} : ${language}`);

    res.json({
      success: true,
      data: { language },
      message: 'Langue mise à jour',
    });
  } catch (error: any) {
    logger.error('❌ updateMyLanguage:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
