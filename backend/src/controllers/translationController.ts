// backend/src/controllers/translationController.ts
import { Request, Response } from 'express';
import {
  translateDocument,
  getTranslation,
  getAllTranslationsForDocument,
  deleteTranslation,
  isTranslationConfigured,
} from '../services/translationService';
import { logAuditFromReq } from '../services/auditLogService';
import { logger } from '../utils/logger';

type DocumentType = 'transcription' | 'memo' | 'text';

const VALID_TYPES: DocumentType[] = ['transcription', 'memo', 'text'];

const isValidType = (t: string): t is DocumentType =>
  VALID_TYPES.includes(t as DocumentType);

// ============================================================
// ✅ TRADUIRE UN DOCUMENT
// ============================================================
export const translateDocumentHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { documentType, documentId } = req.params;
    const { targetLang } = req.body;

    if (!isValidType(documentType)) {
      return res.status(400).json({
        error: 'Type de document invalide (transcription | memo | text)',
      });
    }

    if (!targetLang || typeof targetLang !== 'string') {
      return res.status(400).json({ error: 'targetLang requis' });
    }

    if (!isTranslationConfigured()) {
      return res.status(503).json({
        error: 'Service de traduction indisponible (clés IA non configurées)',
        code: 'TRANSLATION_UNAVAILABLE',
      });
    }

    const result = await translateDocument(
      documentId,
      documentType,
      targetLang,
      userId
    );

    // Audit log
    await logAuditFromReq(req, {
      userId,
      action: 'document_translated',
      targetType: documentType,
      targetId: documentId,
      status: 'success',
      metadata: {
        targetLang: result.targetLang,
        provider: result.provider,
        cached: result.cached,
        length: result.translatedText.length,
      },
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error(`❌ [translation] Erreur: ${error.message}`);

    // Erreur métier connue (text trop long, doc introuvable, etc.)
    const status =
      error.message?.includes('non trouvé') ? 404 :
      error.message?.includes('trop long') ? 413 :
      error.message?.includes('non supportée') ? 400 :
      error.message?.includes('pas encore terminée') ? 400 :
      error.message?.includes('indisponibles') ? 503 :
      500;

    return res.status(status).json({
      success: false,
      error: error.message || 'Erreur de traduction',
    });
  }
};

// ============================================================
// ✅ RÉCUPÉRER UNE TRADUCTION (par langue)
// ============================================================
export const getTranslationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { documentType, documentId } = req.params;
    const { lang } = req.query;

    if (!isValidType(documentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    if (!lang || typeof lang !== 'string') {
      return res.status(400).json({ error: 'Paramètre ?lang= requis' });
    }

    const translation = await getTranslation(documentId, documentType, lang);

    if (!translation) {
      return res.status(404).json({
        success: false,
        error: 'Aucune traduction trouvée pour cette langue',
        code: 'TRANSLATION_NOT_FOUND',
      });
    }

    return res.json({ success: true, data: translation });
  } catch (error: any) {
    logger.error(`❌ [translation] getTranslation: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ LISTER TOUTES LES TRADUCTIONS D'UN DOCUMENT
// ============================================================
export const listTranslationsHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { documentType, documentId } = req.params;

    if (!isValidType(documentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const translations = await getAllTranslationsForDocument(
      documentId,
      documentType
    );

    return res.json({
      success: true,
      data: translations,
      count: translations.length,
    });
  } catch (error: any) {
    logger.error(`❌ [translation] listTranslations: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ SUPPRIMER UNE TRADUCTION
// ============================================================
export const deleteTranslationHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { id } = req.params;

    const deleted = await deleteTranslation(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Traduction non trouvée ou non autorisée',
      });
    }

    await logAuditFromReq(req, {
      userId,
      action: 'document_translation_deleted',
      targetType: 'translation',
      targetId: id,
      status: 'success',
    });

    return res.json({ success: true, message: 'Traduction supprimée' });
  } catch (error: any) {
    logger.error(`❌ [translation] deleteTranslation: ${error.message}`);
    return res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ STATUS (utilisé par le frontend pour désactiver les boutons)
// ============================================================
export const translationStatusHandler = async (_req: Request, res: Response) => {
  return res.json({
    success: true,
    configured: isTranslationConfigured(),
    supportedLangs: ['fr', 'en', 'es', 'pt', 'ar'],
  });
};
