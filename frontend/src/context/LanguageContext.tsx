// frontend/src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';

export interface Language {
  code: string;
  label: string;
  flag: string;
}

interface LanguageContextValue {
  language: string;
  supportedLanguages: Language[];
  loading: boolean;
  changeLanguage: (code: string) => Promise<void>;
  t: (key: string, options?: any) => string;
}

// ✅ Liste statique : plus besoin d'appeler l'API au démarrage !
const FALLBACK_LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t: i18nT, i18n: i18nInstance } = useTranslation();
  
  // ✅ Initialisation instantanée (0 ms)
  const [language, setLanguage] = useState<string>(i18nInstance.language || 'fr');
  const [supportedLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(false); // ✅ On ne bloque plus l'app

  // ✅ Synchronisation de la langue utilisateur en arrière-plan
  useEffect(() => {
    let cancelled = false;

    const syncUserLanguage = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) return; // Pas connecté → on garde la langue du navigateur

      try {
        const meRes = await api.get('/language/me');
        if (!cancelled && meRes.data?.success) {
          const userLang = meRes.data.data.language;
          if (userLang && i18nInstance.language !== userLang) {
            setLanguage(userLang);
            await i18nInstance.changeLanguage(userLang);
          }
        }
      } catch (err: any) {
        if (err.response?.status !== 401) {
          console.warn('[language] /language/me échoué:', err.message);
        }
      }
    };

    syncUserLanguage();
    return () => { cancelled = true; };
  }, [i18nInstance]);

  // ✅ Changer la langue
  const changeLanguage = useCallback(
    async (code: string) => {
      const previous = language;
      setLanguage(code); // Optimistic UI

      try {
        await i18nInstance.changeLanguage(code);
        const token = localStorage.getItem('authToken');
        if (token) {
          await api.put('/language/me', { language: code });
        }
      } catch (error) {
        // Rollback en cas d'erreur
        setLanguage(previous);
        await i18nInstance.changeLanguage(previous);
        throw error;
      }
    },
    [language, i18nInstance]
  );

  const t = useCallback(
    (key: string, options?: any): string => {
      return i18nT(key, options) as string;
    },
    [i18nT]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        supportedLanguages,
        loading,
        changeLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage doit être utilisé dans <LanguageProvider>');
  }
  return ctx;
};
