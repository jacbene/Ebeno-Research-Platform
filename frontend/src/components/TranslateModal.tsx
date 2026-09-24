// frontend/src/components/TranslateModal.tsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { LanguageBadge } from './LanguageBadge';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface TranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentType: 'transcription' | 'memo' | 'text';
  documentTitle: string;
  /** Langue déjà traduite à afficher par défaut (optionnel) */
  initialLang?: string | null;
  /** Callback quand une traduction est créée avec succès */
  onTranslated?: () => void;
}

const SUPPORTED_LANGS = [
  { code: 'fr', flag: '🇫🇷', label: 'Français' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
  { code: 'pt', flag: '🇵🇹', label: 'Português' },
  { code: 'ar', flag: '🇸🇦', label: 'العربية' },
];

const TranslateModal: React.FC<TranslateModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentType,
  documentTitle,
  initialLang,
  onTranslated,
}) => {
  const { colors } = useTheme();
  const toast = useToast();
  const { t } = useTranslation();

  const [targetLang, setTargetLang] = useState(initialLang || 'en');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cached, setCached] = useState(false);
  const [availableTranslations, setAvailableTranslations] = useState<string[]>([]);

  // ✅ Charger la liste des traductions existantes à l'ouverture
  useEffect(() => {
    if (!isOpen) return;

    const fetchExisting = async () => {
      try {
        const res = await api.get(`/translations/${documentType}/${documentId}/all`);
        if (res.data.success) {
          setAvailableTranslations(res.data.data.map((d: any) => d.targetLang));
        }
      } catch {
        // Silencieux — pas bloquant
      }
    };

    fetchExisting();
  }, [isOpen, documentId, documentType]);

  if (!isOpen) return null;

  const handleTranslate = async () => {
    setError('');
    setTranslatedText(null);
    setLoading(true);

    try {
      const res = await api.post(`/translations/${documentType}/${documentId}`, {
        targetLang,
      });

      if (res.data.success) {
        setTranslatedText(res.data.data.translatedText);
        setProvider(res.data.data.provider);
        setCached(res.data.data.cached);
        if (!availableTranslations.includes(targetLang)) {
          setAvailableTranslations([...availableTranslations, targetLang]);
        }
        toast.addToast({
          type: 'success',
          title: t('translation.success'),
        });
        onTranslated?.();
      } else {
        setError(res.data.error || t('translation.error'));
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || t('translation.error');
      setError(msg);
      if (status === 503) {
        setError(t('translation.unavailable'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      toast.addToast({ type: 'success', title: t('translation.copied') });
    } catch {
      toast.addToast({ type: 'error', title: t('common.error') });
    }
  };

  const isArabic = targetLang === 'ar';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: '24px',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 4px 0', color: colors.dark, fontSize: '20px' }}>
            🌍 {t('translation.modalTitle')}
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: colors.gray[500] }}>
            {documentTitle}
          </p>
        </div>

        {/* Langues disponibles (déjà traduites) */}
        {availableTranslations.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', color: colors.gray[500], marginRight: '8px' }}>
              {t('translation.alreadyTranslated')}
            </span>
            <div style={{ display: 'inline-flex', gap: '6px', flexWrap: 'wrap' }}>
              {availableTranslations.map((code) => (
                <LanguageBadge key={code} language={code} size="sm" showCode />
              ))}
            </div>
          </div>
        )}

        {/* Sélecteur de langue */}
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '13px',
              fontWeight: 600,
              color: colors.dark,
            }}
          >
            {t('translation.selectLanguage')}
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '8px',
            }}
          >
            {SUPPORTED_LANGS.map((lang) => {
              const isActive = targetLang === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setTargetLang(lang.code)}
                  style={{
                    padding: '10px 12px',
                    border: `2px solid ${isActive ? colors.primary : colors.gray[300]}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: isActive ? `${colors.primary}12` : colors.white,
                    color: isActive ? colors.primary : colors.dark,
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bouton traduire */}
        <Button
          onClick={handleTranslate}
          disabled={loading}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          {loading ? t('translation.translating') : t('translation.translateButton')}
        </Button>

        {/* Erreur */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: colors.danger,
              padding: '12px 14px',
              borderRadius: theme.borderRadius.md,
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            ❌ {error}
          </div>
        )}

        {/* Résultat */}
        {translatedText && (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LanguageBadge language={targetLang} size="sm" showCode />
                {cached && (
                  <span style={{ fontSize: '11px', color: colors.gray[500] }}>
                    ⚡ {t('translation.cached')}
                  </span>
                )}
                {provider && !cached && (
                  <span style={{ fontSize: '11px', color: colors.gray[500] }}>
                    {provider}
                  </span>
                )}
              </div>
              <button
                onClick={handleCopy}
                style={{
                  background: 'none',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  color: colors.dark,
                }}
              >
                📋 {t('translation.copy')}
              </button>
            </div>

            <div
              dir={isArabic ? 'rtl' : 'ltr'}
              style={{
                flex: 1,
                overflowY: 'auto',
                backgroundColor: colors.gray[50] || '#fafafa',
                border: `1px solid ${colors.gray[200]}`,
                borderRadius: theme.borderRadius.md,
                padding: '16px',
                fontSize: '14px',
                lineHeight: 1.7,
                color: colors.dark,
                whiteSpace: 'pre-wrap',
                maxHeight: '400px',
              }}
            >
              {translatedText}
            </div>
          </>
        )}

        {/* Bouton fermer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TranslateModal;
