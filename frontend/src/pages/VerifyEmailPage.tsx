// frontend/src/pages/VerifyEmailPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';

interface VerifyEmailPageProps {
  onVerified: () => void;
}

type Status = 'verifying' | 'success' | 'error';

const VerifyEmailPage: React.FC<VerifyEmailPageProps> = ({ onVerified }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // ✅ Vérification automatique au chargement
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('verifyEmail.missingToken'));
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await api.post('/auth/verify-email', { token });

        if (cancelled) return;

        if (response.data.success && response.data.token) {
          localStorage.setItem('authToken', response.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.user));
          setStatus('success');

          // Redirection après 1,5s pour laisser voir le message de succès
          setTimeout(() => {
            if (!cancelled) onVerified();
          }, 1500);
        } else {
          setStatus('error');
          setErrorMsg(response.data.message || t('verifyEmail.errorMessage'));
        }
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(
          err.response?.data?.message || t('verifyEmail.errorMessage')
        );
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [token, t, onVerified]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResending(true);
    setResendSuccess(false);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail.trim() });
      setResendSuccess(true);
    } catch {
      // Anti-énumération : on affiche toujours le même message
      setResendSuccess(true);
    } finally {
      setResending(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    padding: '20px',
  };

  // ─── Vue : vérification en cours ───────────────────────────
  if (status === 'verifying') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px',
            border: '3px solid #e0e0e0',
            borderTop: `3px solid ${colors.primary}`,
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('verifyEmail.verifying')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
            {t('verifyEmail.verifyingHint')}
          </p>
        </Card>
      </div>
    );
  }

  // ─── Vue : succès ──────────────────────────────────────────
  if (status === 'success') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('verifyEmail.successTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
            {t('verifyEmail.successMessage')}
          </p>
        </Card>
      </div>
    );
  }

  // ─── Vue : erreur + renvoi ────────────────────────────────
  return (
    <div style={wrapperStyle}>
      <Card style={{ maxWidth: '460px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
          <div style={{ fontSize: '56px', marginBottom: '8px' }}>⚠️</div>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('verifyEmail.errorTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
            {errorMsg || t('verifyEmail.errorMessage')}
          </p>
        </div>

        <hr style={{
          border: 'none',
          borderTop: `1px solid ${colors.gray[200] || '#e9ecef'}`,
          margin: `${theme.spacing.lg} 0`,
        }} />

        <h3 style={{ color: colors.dark, margin: '0 0 8px', fontSize: '16px' }}>
          {t('verifyEmail.resendTitle')}
        </h3>
        <p style={{ color: colors.gray[600], margin: '0 0 16px', fontSize: '13px' }}>
          {t('verifyEmail.resendHint')}
        </p>

        {resendSuccess ? (
          <div style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            textAlign: 'center',
            fontSize: '14px',
          }}>
            ✅ {t('verifyEmail.resendSuccess')}
          </div>
        ) : (
          <form onSubmit={handleResend}>
            <Input
              label={t('auth.login.email')}
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder={t('auth.login.emailPlaceholder')}
              required
            />
            <Button
              type="submit"
              disabled={resending}
              style={{ width: '100%', marginTop: theme.spacing.md }}
            >
              {resending ? t('verifyEmail.resendSending') : t('verifyEmail.resendButton')}
            </Button>
          </form>
        )}

        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            display: 'block',
            margin: `${theme.spacing.lg} auto 0`,
            background: 'none',
            border: 'none',
            color: colors.primary,
            fontWeight: 'bold',
            cursor: 'pointer',
            font: 'inherit',
            fontSize: '14px',
          }}
        >
          {t('verifyEmail.backToLogin')}
        </button>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;
