// frontend/src/index.tsx
// ✅ SENTRY — doit être initialisé EN PREMIER (avant React, avant i18n)
import * as Sentry from '@sentry/react';

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN || '';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.REACT_APP_SENTRY_RELEASE || 'ebeno-frontend@1.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // ✅ Ne pas envoyer les erreurs en dev
    enabled: process.env.NODE_ENV === 'production',

    // ✅ Filtrer les données sensibles avant envoi à Sentry
    beforeSend(event) {
      // Retirer le header Authorization
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['Authorization'];
      }

      // Filtrer les breadcrumbs contenant des tokens
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter((bc) => {
          if (bc.category === 'console' && bc.message?.includes('authToken')) {
            return false;
          }
          return true;
        });
      }

      return event;
    },

    // ✅ Ne pas envoyer les erreurs réseau / offline / chunks obsolètes
    ignoreErrors: [
      'Network request failed',
      'Failed to fetch',
      'NetworkError',
      'Load failed',
      'AbortError',
      'ChunkLoadError', // arrive souvent après un redéploiement (vieux bundle en cache)
    ],
  });

  console.log(`✅ [Sentry] Frontend initialisé (${process.env.NODE_ENV})`);
} else {
  console.log('ℹ️  [Sentry] DSN non configuré — monitoring désactivé');
}

// ============================================================
// REACT
// ============================================================
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ============================================================
// i18n INLINE (pas de fichier séparé → pas de tree-shaking)
// ============================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import fr from './i18n/locales/fr.json';
import en from './i18n/locales/en.json';
import es from './i18n/locales/es.json';
import pt from './i18n/locales/pt.json';
import ar from './i18n/locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
      ar: { translation: ar },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'es', 'pt', 'ar'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    returnNull: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ebeno-language',
      caches: ['localStorage'],
    },
  });

// ✅ Expose i18n pour debug console
if (typeof window !== 'undefined') {
  (window as any).i18n = i18n;
}

// ============================================================
// RENDU REACT
// ============================================================
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
