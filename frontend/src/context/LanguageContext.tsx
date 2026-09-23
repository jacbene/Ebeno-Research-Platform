// frontend/src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
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
  const [language, setLanguage] = useState<string>('fr');
  const [supportedLanguages, setSupportedLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(true);

  // ✅ Chargement initial — UNE SEULE FOIS au mount
  useEffect(() => {
    let cancelled = false;

    const loadLanguage = async () => {
      try {
        // 1. Langues supportées (endpoint public, toujours OK)
        const supportedRes = await api.get('/language/supported');
        if (!cancelled && supportedRes.data?.success) {
          setSupportedLanguages(supportedRes.data.data);
        }

        // 2. ✅ Langue utilisateur SEULEMENT si connecté (token présent)
        const token = localStorage.getItem('authToken');
        if (token && !cancelled) {
          try {
            const meRes = await api.get('/language/me');
            if (!cancelled && meRes.data?.success) {
              const userLang = meRes.data.data.language;
              setLanguage(userLang);
              if (i18nInstance.language !== userLang) {
                await i18nInstance.changeLanguage(userLang);
              }
            }
          } catch (err: any) {
            // ✅ 401 = normal si token expiré → on ignore SILENCIEUSEMENT
            if (err.response?.status !== 401) {
              console.warn('[language] /language/me échoué:', err.message);
            }
          }
        }
      } catch (error) {
        // Fallback navigateur
        if (!cancelled) {
          const navLang = navigator.language?.split('-')[0] || 'fr';
          const supported = FALLBACK_LANGUAGES.map((l) => l.code);
          const detected = supported.includes(navLang) ? navLang : 'fr';
          setLanguage(detected);
          await i18nInstance.changeLanguage(detected);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLanguage();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ Mount only — pas de dépendance i18nInstance (stable)

  // ✅ Changer la langue (sync i18next + backend)
  const changeLanguage = useCallback(
    async (code: string) => {
      const previous = language;
      setLanguage(code); // Optimistic

      try {
        await i18nInstance.changeLanguage(code);
        await api.put('/language/me', { language: code });
      } catch (error) {
        // Rollback
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
