// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './locales/fr.json';
import en from './locales/en.json';

// ✅ Logs de diagnostic AU DÉMARRAGE
console.log('🌍 [i18n] === DÉMARRAGE ===');
console.log('🌍 [i18n] fr.json chargé ?', typeof fr, Object.keys(fr || {}).length, 'clés racines');
console.log('🌍 [i18n] en.json chargé ?', typeof en, Object.keys(en || {}).length, 'clés racines');
console.log('🌍 [i18n] fr.nav :', fr?.nav);
console.log('🌍 [i18n] fr.dashboard.greeting :', fr?.dashboard?.greeting);

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

    // ✅ CRITIQUE : ne pas retourner null/undefined
    returnNull: false,
    returnEmptyString: false,

    // ✅ Debug ACTIVÉ (temporaire pour diagnostic)
    debug: true,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ebeno-language',
      caches: ['localStorage'],
    },

    // ✅ Trace les clés manquantes
    parseMissingKeyHandler: (key: string, defaultValue?: string) => {
      console.warn(`⚠️ [i18n] CLÉ MANQUANTE : "${key}"`);
      return defaultValue || key;
    },
  })
  .then(() => {
    console.log('🌍 [i18n] ✅ INITIALISÉ');
    console.log('🌍 [i18n] Langue active :', i18n.language);
    console.log('🌍 [i18n] Test nav.dashboard :', i18n.t('nav.dashboard'));
    console.log('🌍 [i18n] Test dashboard.greeting :', i18n.t('dashboard.greeting', { name: 'Test' }));
    console.log('🌍 [i18n] Test auth.login.email :', i18n.t('auth.login.email'));
    console.log('🌍 [i18n] Ressources chargées :', Object.keys(i18n.store.data));

    // ✅ Expose i18n au global pour tests console
    if (typeof window !== 'undefined') {
      (window as any).i18n = i18n;
    }
  })
  .catch((err) => {
    console.error('🌍 [i18n] ❌ ERREUR INIT :', err);
  });

export default i18n;
