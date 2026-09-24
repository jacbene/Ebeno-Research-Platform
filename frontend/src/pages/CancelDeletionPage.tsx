// frontend/src/pages/CancelDeletionPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';

type Status = 'verifying' | 'success' | 'error';

const CancelDeletionPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg(t('cancelDeletion.missingToken'));
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const res = await api.post('/auth/cancel-deletion', { token });
        if (cancelled) return;

        if (res.data.success) {
          setStatus('success');
          setTimeout(() => {
            if (!cancelled) navigate('/login');
          }, 2500);
        } else {
          setStatus('error');
          setErrorMsg(res.data.message || t('cancelDeletion.errorMessage'));
        }
      } catch (err: any) {
        if (cancelled) return;
        setStatus('error');
        setErrorMsg(err.response?.data?.message || t('cancelDeletion.errorMessage'));
      }
    };

    verify();
    return () => { cancelled = true; };
  }, [token, t, navigate]);

  const wrapperStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    padding: '20px',
  };

  // ─── Vérification ───
  if (status === 'verifying') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{
            width: '48px', height: '48px',
            border: '3px solid #e0e0e0',
            borderTop: `3px solid ${colors.primary}`,
            borderRadius: '50%', margin: '0 auto 20px',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('cancelDeletion.verifying')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
            {t('cancelDeletion.verifyingHint')}
          </p>
        </Card>
      </div>
    );
  }

  // ─── Succès ───
  if (status === 'success') {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>✅</div>
          <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
            {t('cancelDeletion.successTitle')}
          </h2>
          <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
            {t('cancelDeletion.successMessage')}
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
            {t('cancelDeletion.backToLogin')}
          </Link>
        </Card>
      </div>
    );
  }

  // ─── Erreur ───
  return (
    <div style={wrapperStyle}>
      <Card style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>⚠️</div>
        <h2 style={{ color: colors.dark, margin: '0 0 12px' }}>
          {t('cancelDeletion.errorTitle')}
        </h2>
        <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px', lineHeight: 1.6 }}>
          {errorMsg || t('cancelDeletion.errorMessage')}
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
          {t('cancelDeletion.backToLogin')}
        </Link>
      </Card>
    </div>
  );
};

export default CancelDeletionPage;
