// frontend/src/components/DeleteAccountModal.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../services/api';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CONFIRM_PHRASE = 'DELETE MY ACCOUNT';

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (confirmPhrase !== CONFIRM_PHRASE) {
      setError(t('settings.dangerZone.phraseMismatch'));
      return;
    }
    if (!understood) {
      setError(t('settings.dangerZone.mustUnderstand'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.delete('/auth/me', {
        data: { password, confirmPhrase, reason: 'user_request' },
      });
      if (res.data.success) {
        onSuccess();
      } else {
        setError(res.data.message || t('settings.dangerZone.error'));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || t('settings.dangerZone.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '8px' }}>⚠️</div>
        <h2 style={{ textAlign: 'center', color: colors.danger, margin: '0 0 12px' }}>
          {t('settings.dangerZone.modalTitle')}
        </h2>
        <p style={{ color: colors.gray[600], textAlign: 'center', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
          {t('settings.dangerZone.modalIntro')}
        </p>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2', color: colors.danger,
            padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md, textAlign: 'center', fontSize: '13px',
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label={t('settings.dangerZone.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Input
            label={t('settings.dangerZone.phraseLabel', { phrase: CONFIRM_PHRASE })}
            type="text"
            value={confirmPhrase}
            onChange={(e) => setConfirmPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            required
          />

          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            marginTop: theme.spacing.md, marginBottom: theme.spacing.md,
            fontSize: '13px', color: colors.dark, cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              style={{ marginTop: '2px', flexShrink: 0 }}
            />
            <span>{t('settings.dangerZone.understandCheckbox')}</span>
          </label>

          <div style={{
            backgroundColor: '#FEF3C7', borderLeft: '3px solid #F59E0B',
            padding: '12px 14px', borderRadius: '6px', marginBottom: '20px',
          }}>
            <p style={{ margin: 0, color: '#92400E', fontSize: '12px', lineHeight: 1.6 }}>
              📬 {t('settings.dangerZone.spamWarning')}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !understood}
              style={{ flex: 1, backgroundColor: colors.danger, borderColor: colors.danger }}
            >
              {loading ? t('settings.dangerZone.deleting') : t('settings.dangerZone.confirmButton')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
