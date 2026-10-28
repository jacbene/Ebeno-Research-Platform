// frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ✅ i18n INLINE (pas de fichier séparé → pas de tree-shaking)
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
// ✅ SENTRY — Chargé en différé (hors chemin critique)
// ============================================================
const initSentry = async () => {
  try {
    const Sentry = await import('@sentry/react');
    const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

    if (SENTRY_DSN) {
      Sentry.init({
  dsn: SENTRY_DSN,
  environment: import.meta.env.MODE || 'development',
  release: import.meta.env.VITE_SENTRY_RELEASE || 'ebeno-frontend@1.0.0',
  tracesSampleRate: import.meta.env.MODE === 'production' ? 0.1 : 1.0,
  enabled: import.meta.env.MODE === 'production',
  
  // ✅ Force le tree-shaking de Replay et Feedback
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,       
     
        // ✅ On désactive explicitement les modules lourds (Replay & Feedback)
        integrations: (defaults) => defaults.filter((integration) => 
          !['Replay', 'Feedback', 'ReplayCanvas'].includes(integration.name)
        ),
        
        // ✅ Filtrer les données sensibles avant envoi à Sentry
        beforeSend(event) {
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['Authorization'];
          }
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
        
        ignoreErrors: [
          'Network request failed', 'Failed to fetch', 'NetworkError',
          'Load failed', 'AbortError', 'ChunkLoadError',
        ],
      });
      console.log(`✅ [Sentry] Frontend initialisé`);
    }
  } catch (err) {
    console.warn('⚠️ [Sentry] Impossible de charger le SDK:', err);
  }
};

// Lance Sentry 1 seconde après le rendu initial
setTimeout(initSentry, 1000);

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
