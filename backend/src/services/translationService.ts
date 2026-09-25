// backend/src/services/translationService.ts
// ✅ Service de traduction à la demande (DeepSeek → OpenAI cascade)

import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  isServiceAvailable,
  recordFailure,
  recordSuccess,
} from './circuitBreaker';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const SERVICE_DEEPSEEK = 'deepseek';
const SERVICE_OPENAI = 'openai';

const MAX_TEXT_LENGTH = 50_000;
const SUPPORTED_LANGS = ['fr', 'en', 'es', 'pt', 'ar'] as const;
type Lang = typeof SUPPORTED_LANGS[number];

export type DocumentType = 'transcription' | 'memo' | 'text' | 'collaboration';

export interface TranslationResult {
  id: string;
  documentId: string;
  documentType: DocumentType;
  targetLang: Lang;
  sourceLang: string | null;
  translatedText: string;
  provider: string;
  cached: boolean;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const LANG_NAMES: Record<Lang, string> = {
  fr: 'French',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  ar: 'Arabic',
};

const generateId = (): string =>
  `tr-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

const buildSystemPrompt = (targetLang: Lang): string => {
  const langName = LANG_NAMES[targetLang];
  return `You are a professional translator specialized in academic and research texts.
Your task is to translate the user's text into ${langName}.
Rules:
- Preserve the original meaning, tone, and style
- Keep technical terms accurate
- Preserve paragraph structure and formatting
- Do NOT add any commentary, introduction, or explanation
- Return ONLY the translated text
- If the text is already in ${langName}, return it unchanged`;
};

const truncate = (text: string): { text: string; truncated: boolean } => {
  if (text.length <= MAX_TEXT_LENGTH) return { text, truncated: false };
  return { text: text.substring(0, MAX_TEXT_LENGTH), truncated: true };
};

// ────────────────────────────────────────────────────────────
// Appels IA
// ────────────────────────────────────────────────────────────

const translateWithDeepSeek = async (
  text: string,
  targetLang: Lang
): Promise<string> => {
  if (!DEEPSEEK_API_KEY || !DEEPSEEK_API_KEY.startsWith('sk-')) {
    throw new Error('DEEPSEEK_API_KEY non configurée');
  }

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: buildSystemPrompt(targetLang) },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (response.status === 401) throw new Error('DeepSeek 401 : clé API invalide');
  if (response.status === 402) throw new Error('DeepSeek 402 : solde insuffisant');
  if (response.status === 429) throw new Error('Quota DeepSeek dépassé');
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek ${response.status} : ${errText.substring(0, 200)}`);
  }

  const data: any = await response.json();
  const translated = data?.choices?.[0]?.message?.content;
  if (!translated) throw new Error('Réponse DeepSeek vide');
  return translated.trim();
};

const translateWithOpenAI = async (
  text: string,
  targetLang: Lang
): Promise<string> => {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY non configurée');
  }

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: buildSystemPrompt(targetLang) },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (response.status === 401) throw new Error('OpenAI 401 : clé API invalide');
  if (response.status === 429) throw new Error('Quota OpenAI dépassé');
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI ${response.status} : ${errText.substring(0, 200)}`);
  }

  const data: any = await response.json();
  const translated = data?.choices?.[0]?.message?.content;
  if (!translated) throw new Error('Réponse OpenAI vide');
  return translated.trim();
};

// ────────────────────────────────────────────────────────────
// Cascade DeepSeek → OpenAI
// ────────────────────────────────────────────────────────────

const translateText = async (
  text: string,
  targetLang: Lang
): Promise<{ translated: string; provider: string }> => {
  // 1️⃣ DeepSeek
  if (isServiceAvailable(SERVICE_DEEPSEEK)) {
    try {
      logger.info(`🟣 [translation] Tentative DeepSeek → ${targetLang}...`);
      const translated = await translateWithDeepSeek(text, targetLang);
      recordSuccess(SERVICE_DEEPSEEK);
      return { translated, provider: 'deepseek' };
    } catch (err: any) {
      recordFailure(SERVICE_DEEPSEEK, err);
      logger.warn(`⚠️ [translation] DeepSeek échoué : ${err.message}`);
    }
  } else {
    logger.info('⏭️ [translation] DeepSeek ignoré (circuit ouvert)');
  }

  // 2️⃣ OpenAI
  if (isServiceAvailable(SERVICE_OPENAI)) {
    try {
      logger.info(`🔵 [translation] Tentative OpenAI → ${targetLang}...`);
      const translated = await translateWithOpenAI(text, targetLang);
      recordSuccess(SERVICE_OPENAI);
      return { translated, provider: 'openai' };
    } catch (err: any) {
      recordFailure(SERVICE_OPENAI, err);
      logger.warn(`⚠️ [translation] OpenAI échoué : ${err.message}`);
    }
  } else {
    logger.info('⏭️ [translation] OpenAI ignoré (circuit ouvert)');
  }

  throw new Error('Tous les services de traduction sont indisponibles');
};

// ────────────────────────────────────────────────────────────
// Récupération du texte source selon le type de document
// ────────────────────────────────────────────────────────────

const fetchSourceText = async (
  documentId: string,
  documentType: DocumentType,
  userId: string
): Promise<{ text: string; sourceLang: string | null; title: string }> => {
  // ✅ Audio (transcription) ET textes importés — même table "transcriptions"
  if (documentType === 'transcription' || documentType === 'text') {
    const doc = await db('transcriptions').where({ id: documentId }).first();
    if (!doc) throw new Error('Document non trouvé');

    // ✅ Vérifier l'accès (propriétaire OU membre du projet)
    if (doc.userId !== userId) {
      if (!doc.projectId) {
        throw new Error('Accès non autorisé');
      }
      const member = await db('project_members')
        .where({ projectId: doc.projectId, userId })
        .first();
      if (!member) throw new Error('Accès non autorisé');
    }

    if (!doc.transcriptText || doc.transcriptText.trim().length < 10) {
      throw new Error(
        documentType === 'text'
          ? 'Le texte est vide ou trop court'
          : 'La transcription n\'est pas encore prête'
      );
    }

    return {
      text: doc.transcriptText,
      sourceLang: doc.language || null,
      title:
        doc.title ||
        (documentType === 'text' ? 'Texte importé' : 'Transcription'),
    };
  }

  // ✅ Memos
  if (documentType === 'memo') {
    const doc = await db('memos').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Memo non trouvé');
    if (!doc.content || doc.content.trim().length < 10) {
      throw new Error('Le memo est vide ou trop court');
    }
    return {
      text: doc.content,
      sourceLang: doc.language || null,
      title: doc.title || 'Memo',
    };
  }

  // ✅ Documents collaboratifs
  if (documentType === 'collaboration') {
    const doc = await db('collaboration_documents')
      .where({ id: documentId })
      .first();
    if (!doc) throw new Error('Document collaboratif non trouvé');

    const member = await db('project_members')
      .where({ projectId: doc.projectId, userId })
      .first();
    if (!member) throw new Error('Accès non autorisé à ce document');

    if (!doc.content || doc.content.trim().length < 10) {
      throw new Error('Le document est vide ou trop court');
    }
    return {
      text: doc.content,
      sourceLang: null,
      title: doc.title || 'Document collaboratif',
    };
  }

  throw new Error('Type de document non supporté');
};

// ────────────────────────────────────────────────────────────
// ✅ FONCTION PRINCIPALE
// ────────────────────────────────────────────────────────────

export const translateDocument = async (
  documentId: string,
  documentType: DocumentType,
  targetLang: string,
  userId: string
): Promise<TranslationResult> => {
  // Validation
  const lang = targetLang.toLowerCase() as Lang;
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(`Langue non supportée : ${targetLang}`);
  }

  // 1. Vérifier le cache DB
  const cached = await db('document_translations')
    .where({ documentId, documentType, targetLang: lang })
    .first();

  if (cached) {
    logger.info(
      `✅ [translation] Cache hit pour ${documentType}/${documentId} → ${lang}`
    );
    return {
      id: cached.id,
      documentId: cached.documentId,
      documentType: cached.documentType,
      targetLang: cached.targetLang,
      sourceLang: cached.sourceLang,
      translatedText: cached.translatedText,
      provider: cached.provider || 'cache',
      cached: true,
    };
  }

  // 2. Récupérer le texte source
  const { text, sourceLang, title } = await fetchSourceText(
    documentId,
    documentType,
    userId
  );

  // 3. Vérifier la taille
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `Document trop long (${text.length} caractères > ${MAX_TEXT_LENGTH} max)`
    );
  }

  if (text.length < 10) {
    throw new Error('Texte trop court pour être traduit');
  }

  // 4. Traduire
  logger.info(
    `🌍 [translation] ${documentType}/${documentId} (${text.length} chars) → ${lang}`
  );
  const { translated, provider } = await translateText(text, lang);

  // 5. Sauvegarder en DB
  const id = generateId();
  const now = new Date().toISOString();

  await db('document_translations').insert({
    id,
    documentId,
    documentType,
    targetLang: lang,
    sourceLang,
    translatedText: translated,
    provider,
    requestedBy: userId,
    createdAt: now,
    updatedAt: now,
  });

  logger.info(`✅ [translation] ${title} traduit en ${lang} via ${provider}`);

  return {
    id,
    documentId,
    documentType,
    targetLang: lang,
    sourceLang,
    translatedText: translated,
    provider,
    cached: false,
  };
};

// ────────────────────────────────────────────────────────────
// Autres opérations
// ────────────────────────────────────────────────────────────

export const getTranslation = async (
  documentId: string,
  documentType: DocumentType,
  targetLang: string
): Promise<TranslationResult | null> => {
  const row = await db('document_translations')
    .where({ documentId, documentType, targetLang: targetLang.toLowerCase() })
    .first();

  if (!row) return null;

  return {
    id: row.id,
    documentId: row.documentId,
    documentType: row.documentType,
    targetLang: row.targetLang,
    sourceLang: row.sourceLang,
    translatedText: row.translatedText,
    provider: row.provider || 'unknown',
    cached: true,
  };
};

export const getAllTranslationsForDocument = async (
  documentId: string,
  documentType: DocumentType
) => {
  return db('document_translations')
    .where({ documentId, documentType })
    .select('id', 'targetLang', 'sourceLang', 'provider', 'createdAt')
    .orderBy('createdAt', 'desc');
};

export const deleteTranslation = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const deleted = await db('document_translations')
    .where({ id, requestedBy: userId })
    .delete();
  return deleted > 0;
};

export const isTranslationConfigured = (): boolean => {
  const hasDeepSeek = !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith('sk-');
  const hasOpenAI = !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-');
  return hasDeepSeek || hasOpenAI;
};

export default {
  translateDocument,
  getTranslation,
  getAllTranslationsForDocument,
  deleteTranslation,
  isTranslationConfigured,
};
