
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  // Permet de charger les traductions depuis un backend (ex: /locales/{{lng}}/{{ns}}.json)
  .use(HttpApi)
  // Détecte la langue de l'utilisateur
  .use(LanguageDetector)
  // Passe l'instance i18n à react-i18next
  .use(initReactI18next)
  .init({
    // Langues supportées
    supportedLngs: ['en', 'fr', 'ar'],
    
    // Langue par défaut si la détection échoue
    fallbackLng: 'fr',
    
    // Namespace par défaut
    defaultNS: 'translation',

    // Configuration du détecteur de langue
    detection: {
      // Ordre de détection : querystring, cookie, localStorage, session, navigateur, htmlTag
      order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      // Clés à utiliser pour la détection
      caches: ['cookie', 'localStorage'],
    },

    // Configuration pour le backend de chargement
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Options pour react-i18next
    react: {
      useSuspense: true, // Recommandé pour charger les traductions de manière asynchrone
    },
  });

export default i18n;
