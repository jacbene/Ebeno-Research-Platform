// backend/src/services/languageDetectionService.ts
import { detect as tinyldDetect } from 'tinyld';
import { logger } from '../utils/logger';
import { SUPPORTED_CODES, DEFAULT_LANGUAGE, normalizeLanguage } from './languageService';

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export interface DetectionResult {
  /** Code ISO 639-1 ('fr', 'en'...) ou null si indéterminé */
  language: string | null;
  /** Fiable ? */
  confidence: Confidence;
  /** Est-ce dans nos langues supportées ? */
  isSupported: boolean;
  /** Code brut retourné par tinyld (utile pour debug) */
  raw: string | null;
}

const MIN_TEXT_LENGTH_FOR_DETECTION = 30;

/**
 * Détecte la langue d'un texte.
 *
 * Stratégie :
 * 1. Si le texte est trop court (< 30 caractères), on retourne "indéterminé"
 *    (tinyld a besoin d'un minimum de contenu pour être fiable).
 * 2. Sinon, on utilise tinyld qui retourne un code ISO 639-1.
 * 3. On vérifie si la langue est supportée par Ebeno.
 *
 * Exemples :
 *   detectLanguage('Bonjour, ceci est un texte en français.') → { language: 'fr', ... }
 *   detectLanguage('Hello, this is a test')                    → { language: 'en', ... }
 *   detectLanguage('Hola')                                     → { language: null, confidence: 'none' }
 */
export const detectLanguage = (text: string | null | undefined): DetectionResult => {
  // Cas 1 : texte vide ou trop court
  if (!text || text.trim().length < MIN_TEXT_LENGTH_FOR_DETECTION) {
    return {
      language: null,
      confidence: 'none',
      isSupported: false,
      raw: null,
    };
  }

  try {
    const cleanText = text.slice(0, 5000); // Limite : 5000 chars suffisent pour détecter
    const raw = tinyldDetect(cleanText);

    // tinyld retourne une string vide si indéterminé
    if (!raw || raw === '') {
      return {
        language: null,
        confidence: 'low',
        isSupported: false,
        raw: null,
      };
    }

    const language = raw.toLowerCase();

    // Confiance basée sur la longueur du texte
    const confidence: Confidence =
      cleanText.length > 300 ? 'high' :
      cleanText.length > 100 ? 'medium' :
      'low';

    const isSupported = SUPPORTED_CODES.includes(language as any);

    logger.debug?.(
      `🌍 [lang] Détecté : ${language} (confiance: ${confidence}, supporté: ${isSupported})`
    );

    return {
      language,
      confidence,
      isSupported,
      raw,
    };
  } catch (error: any) {
    logger.warn('⚠️ [lang] Détection échouée :', error.message);
    return {
      language: null,
      confidence: 'none',
      isSupported: false,
      raw: null,
    };
  }
};

/**
 * Détecte la langue et retourne un code supporté (fallback sur le défaut).
 *
 * Utile quand on doit **toujours** avoir une langue :
 *   const lang = detectLanguageOrFallback(text, 'fr'); // → 'fr' si indéterminé
 */
export const detectLanguageOrFallback = (
  text: string | null | undefined,
  fallback: string = DEFAULT_LANGUAGE
): string => {
  const result = detectLanguage(text);
  if (result.language && result.isSupported) {
    return result.language;
  }
  return normalizeLanguage(fallback);
};

/**
 * Log structuré d'une détection (utile pour debug / monitoring).
 */
export const logDetection = (
  context: string,
  text: string,
  result: DetectionResult
): void => {
  logger.info(
    `🌍 [lang:${context}] ${result.language || 'indéterminé'} (${result.confidence})` +
      (text ? ` — "${text.slice(0, 40)}..."` : '')
  );
};
