// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ============================================================
// ✅ i18n INLINE (pas de fichier séparé → pas de tree-shaking)
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
      es: { translation: es },   // ✅ NOUVEAU
      pt: { translation: pt },   // ✅ NOUVEAU
      ar: { translation: ar },   // ✅ NOUVEAU
    },
    fallbackLng: 'fr',
   supportedLngs: ['fr', 'en', 'es', 'pt', 'ar'],   // ← 5 langues
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

// ✅ Expose pour debug console
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
