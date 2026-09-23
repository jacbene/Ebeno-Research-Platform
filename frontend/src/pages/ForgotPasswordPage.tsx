// frontend/src/pages/ForgotPasswordPage.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';

const ForgotPasswordPage: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err: any) {
      // Anti-énumération : on affiche toujours le même succès
      setSent(true);
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
  if (sent) {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '12px' }}>📧</div>
          <h2 style={{ color: colors.dark, margin: '0 0 12px' }}>
            {t('forgotPassword.successTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            {t('forgotPassword.successMessage')}
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
            {t('forgotPassword.backToLogin')}
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
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔑</div>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('forgotPassword.title')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            {t('forgotPassword.intro')}
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
            label={t('forgotPassword.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.login.emailPlaceholder')}
            required
            autoFocus
          />
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
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
          {t('forgotPassword.backToLogin')}
        </Link>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
