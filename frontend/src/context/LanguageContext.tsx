// frontend/src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  t: (key: string) => string;
}

// Traductions inline (à étendre progressivement)
const TRANSLATIONS: Record<string, Record<string, string>> = {
  fr: {
    'settings.title': 'Paramètres',
    'settings.language': 'Langue de l\'interface',
    'settings.language.help': 'Cette langue sera utilisée pour les résumés IA et les notifications.',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'language.updated': 'Langue mise à jour',
    'language.error': 'Impossible de changer la langue',
  },
  en: {
    'settings.title': 'Settings',
    'settings.language': 'Interface language',
    'settings.language.help': 'This language will be used for AI summaries and notifications.',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'language.updated': 'Language updated',
    'language.error': 'Unable to change language',
  },
  es: {
    'settings.title': 'Configuración',
    'settings.language': 'Idioma de la interfaz',
    'settings.language.help': 'Este idioma se usará para los resúmenes de IA y notificaciones.',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'language.updated': 'Idioma actualizado',
    'language.error': 'No se pudo cambiar el idioma',
  },
  pt: {
    'settings.title': 'Configurações',
    'settings.language': 'Idioma da interface',
    'settings.language.help': 'Este idioma será usado para resumos de IA e notificações.',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Carregando...',
    'language.updated': 'Idioma atualizado',
    'language.error': 'Não foi possível alterar o idioma',
  },
  ar: {
    'settings.title': 'الإعدادات',
    'settings.language': 'لغة الواجهة',
    'settings.language.help': 'ستُستخدم هذه اللغة لملخصات الذكاء الاصطناعي والإشعارات.',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.loading': 'جار التحميل...',
    'language.updated': 'تم تحديث اللغة',
    'language.error': 'تعذر تغيير اللغة',
  },
};

// Langues supportées (fallback si l'API échoue)
const FALLBACK_LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<string>('fr');
  const [supportedLanguages, setSupportedLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [loading, setLoading] = useState(true);

  // ✅ Charger la langue de l'utilisateur au démarrage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        // 1. Charger la liste des langues supportées (une seule fois)
        const supportedRes = await api.get('/language/supported');
        if (supportedRes.data?.success) {
          setSupportedLanguages(supportedRes.data.data);
        }

        // 2. Charger la langue de l'utilisateur
        const meRes = await api.get('/language/me');
        if (meRes.data?.success) {
          setLanguage(meRes.data.data.language);
        }
      } catch (error: any) {
        // Fallback : détecter la langue du navigateur
        const navLang = navigator.language?.split('-')[0] || 'fr';
        const supported = FALLBACK_LANGUAGES.map((l) => l.code);
        setLanguage(supported.includes(navLang) ? navLang : 'fr');
      } finally {
        setLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // ✅ Fonction pour changer la langue
  const changeLanguage = useCallback(async (code: string) => {
    const previous = language;
    setLanguage(code); // Optimistic update

    try {
      await api.put('/language/me', { language: code });
    } catch (error) {
      setLanguage(previous); // Rollback
      throw error;
    }
  }, [language]);

  // ✅ Fonction de traduction simple (fallback : retourne la clé)
  const t = useCallback(
    (key: string): string => {
      return TRANSLATIONS[language]?.[key] || TRANSLATIONS.fr[key] || key;
    },
    [language]
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
