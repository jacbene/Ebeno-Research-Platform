// backend/src/services/languageService.ts

/**
 * Langues officiellement supportées par Ebeno.
 * Étendre cette liste au fur et à mesure (voir ROADMAP Phase 6).
 */
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية',   flag: '🇸🇦' },
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]['code'];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

/**
 * Vérifie qu'un code de langue est supporté.
 */
export const isValidLanguage = (code: unknown): code is SupportedLanguage => {
  if (typeof code !== 'string') return false;
  return SUPPORTED_CODES.includes(code as SupportedLanguage);
};

/**
 * Normalise un code de langue (gère les variantes comme 'fr-FR' → 'fr').
 */
export const normalizeLanguage = (code: string | null | undefined): SupportedLanguage => {
  if (!code) return DEFAULT_LANGUAGE;

  // 'fr-FR' → 'fr', 'en-US' → 'en', 'pt-BR' → 'pt'
  const base = code.split('-')[0].toLowerCase();

  return isValidLanguage(base) ? base : DEFAULT_LANGUAGE;
};

/**
 * Instructions de langue pour les prompts IA.
 */
export const AI_LANGUAGE_INSTRUCTIONS: Record<SupportedLanguage, string> = {
  fr: 'Rédigez en français',
  en: 'Write in English',
  es: 'Escribe en español',
  pt: 'Escreva em português',
  ar: 'اكتب بالعربية',
};

/**
 * Noms de langues pour la détection.
 */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'français',
  en: 'anglais',
  es: 'espagnol',
  pt: 'portugais',
  ar: 'arabe',
};
