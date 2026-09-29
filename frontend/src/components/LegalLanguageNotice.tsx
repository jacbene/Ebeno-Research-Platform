import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Bandeau d'avertissement affiché en haut des pages légales
 * quand la langue de l'utilisateur n'est pas le français.
 *
 * Le contenu juridique reste en français (version officielle).
 */
const LegalLanguageNotice: React.FC = () => {
  const { i18n } = useTranslation();

  // Pas d'avertissement en français
  if (i18n.language === 'fr') return null;

  const notice = i18n.t('legal.pages.frenchOnlyNotice', { defaultValue: '' });
  if (!notice) return null;

  return (
    <div
      role="note"
      style={{
        maxWidth: 800,
        margin: '1rem auto 0',
        padding: '12px 16px',
        backgroundColor: '#FFF8E1',
        border: '1px solid #FFE082',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: 1.5,
        color: '#664D00',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
      }}
    >
      <span style={{ fontSize: '18px', lineHeight: 1 }}>🌐</span>
      <span>{notice}</span>
    </div>
  );
};

export default LegalLanguageNotice;
