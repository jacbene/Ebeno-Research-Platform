// frontend/src/pages/ResetPasswordPage.tsx
import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';

type Status = 'form' | 'success' | 'error';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<Status>(token ? 'form' : 'error');
  const [error, setError] = useState(
    token ? '' : t('resetPassword.missingToken')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t('resetPassword.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('resetPassword.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      if (res.data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setError(res.data.message || t('resetPassword.errorMessage'));
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.response?.data?.message || t('resetPassword.errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    padding: '20px',
  };

  // ─── Vue succès ────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: colors.dark, margin: '0 0 12px' }}>
            {t('resetPassword.successTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            {t('resetPassword.successMessage')}
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              marginTop: theme.spacing.lg,
              color: colors.primary,
              fontWeight: 'bold',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {t('resetPassword.backToLogin')}
          </Link>
        </Card>
      </div>
    );
  }

  // ─── Vue erreur ────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚠️</div>
          <h2 style={{ color: colors.dark, margin: '0 0 12px' }}>
            {t('resetPassword.errorTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            {error || t('resetPassword.errorMessage')}
          </p>
          <Link
            to="/forgot-password"
            style={{
              display: 'inline-block',
              marginTop: theme.spacing.lg,
              color: colors.primary,
              fontWeight: 'bold',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            {t('resetPassword.requestNew')}
          </Link>
        </Card>
      </div>
    );
  }

  // ─── Vue formulaire ────────────────────────────────────────
  return (
    <div style={wrapperStyle}>
      <Card style={{ maxWidth: '440px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('resetPassword.title')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
            {t('resetPassword.intro')}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#FEE2E2', color: colors.danger,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            textAlign: 'center', fontSize: '14px',
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Input
            label={t('resetPassword.newPassword')}
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('resetPassword.newPasswordPlaceholder')}
            required
            autoFocus
          />
          <Input
            label={t('resetPassword.confirmPassword')}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('resetPassword.confirmPasswordPlaceholder')}
            required
          />
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </Button>
        </form>

        <Link
          to="/login"
          style={{
            display: 'block',
            textAlign: 'center',
            marginTop: theme.spacing.lg,
            color: colors.primary,
            fontWeight: 'bold',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          {t('resetPassword.backToLogin')}
        </Link>
      </Card>
    </div>
  );
};

export default ResetPasswordPage;
