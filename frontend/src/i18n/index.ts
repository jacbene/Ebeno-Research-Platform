// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';

// ✅ Langues supportées
const SUPPORTED_LANGS = ['fr', 'en', 'es', 'pt', 'ar'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    fallbackLng: 'fr',
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React échappe déjà
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ebeno-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
