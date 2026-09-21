// frontend/src/i18n/useRTL.ts
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Langues qui s'écrivent de droite à gauche (RTL).
 * Pour ajouter une langue RTL (hébreu, persan, ourdou...), ajoute son code ici.
 */
const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

/**
 * Hook qui synchronise l'attribut `dir` du <html> avec la langue active.
 * - lang="ar" + dir="rtl" quand on est en arabe
 * - lang="fr" + dir="ltr" sinon
 */
export const useRTL = (): void => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lang = (i18n.language || 'fr').split('-')[0];
    const isRTL = RTL_LANGUAGES.includes(lang);

    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';

    // Ajoute une classe utilitaire sur <body> pour permettre
    // des styles CSS conditionnels (ex: `.rtl .some-element { ... }`)
    if (isRTL) {
      document.body.classList.add('rtl');
    } else {
      document.body.classList.remove('rtl');
    }
  }, [i18n.language]);
};
