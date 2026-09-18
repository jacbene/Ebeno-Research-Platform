// frontend/src/components/LanguageBadge.tsx
import React from 'react';

interface LanguageBadgeProps {
  /** Code ISO 639-1 : 'fr' | 'en' | 'es' | 'pt' | 'ar' | null */
  language?: string | null;
  /** Taille */
  size?: 'sm' | 'md';
  /** Afficher le code texte à côté du drapeau */
  showCode?: boolean;
  /** Style inline supplémentaire */
  style?: React.CSSProperties;
}

const LANGUAGE_META: Record<string, { flag: string; label: string }> = {
  fr: { flag: '🇫🇷', label: 'Français' },
  en: { flag: '🇬🇧', label: 'English' },
  es: { flag: '🇪🇸', label: 'Español' },
  pt: { flag: '🇵🇹', label: 'Português' },
  ar: { flag: '🇸🇦', label: 'العربية' },
};

/**
 * Badge de langue affiché sur les documents.
 * Retourne null si la langue est inconnue (silencieux).
 */
export const LanguageBadge: React.FC<LanguageBadgeProps> = ({
  language,
  size = 'sm',
  showCode = false,
  style,
}) => {
  if (!language) return null;

  const meta = LANGUAGE_META[language] || {
    flag: '🌍',
    label: language.toUpperCase(),
  };

  const padding = size === 'sm' ? '2px 6px' : '4px 10px';
  const fontSize = size === 'sm' ? '11px' : '13px';
  const flagSize = size === 'sm' ? '12px' : '16px';

  return (
    <span
      title={`Langue : ${meta.label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding,
        backgroundColor: '#f0f4ff',
        color: '#4A6CF7',
        borderRadius: '10px',
        fontSize,
        fontWeight: 600,
        lineHeight: 1,
        border: '1px solid #d8e2ff',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={{ fontSize: flagSize, lineHeight: 1 }}>{meta.flag}</span>
      {showCode && <span>{language.toUpperCase()}</span>}
    </span>
  );
};

export default LanguageBadge;
