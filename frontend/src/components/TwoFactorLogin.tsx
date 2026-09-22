// frontend/src/components/TwoFactorLogin.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { api } from '../services/api';

interface TwoFactorLoginProps {
  tempToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorLogin: React.FC<TwoFactorLoginProps> = ({
  tempToken,
  onSuccess,
  onCancel,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code.trim()) {
      setError('Veuillez saisir un code');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/2fa-login', {
        tempToken,
        code: code.trim(),
        useBackupCode: useBackup,
      });

      if (res.data.success && res.data.token) {
        localStorage.setItem('authToken', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onSuccess();
      } else {
        setError(res.data.message || 'Code invalide');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
        padding: '20px',
      }}
    >
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>🔐</div>
          <h1 style={{ fontSize: '20px', margin: '0 0 6px 0', color: colors.dark }}>
            Vérification en 2 étapes
          </h1>
          <p style={{ fontSize: '13px', color: colors.gray[600], margin: 0 }}>
            {useBackup
              ? 'Saisissez l\'un de vos codes de secours'
              : 'Saisissez le code à 6 chiffres de votre application'}
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              color: colors.danger,
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {useBackup ? (
            <Input
              label="Code de secours"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              autoFocus
            />
          ) : (
            <Input
              label="Code à 6 chiffres"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
            />
          )}

          <Button
            type="submit"
            disabled={loading || !code.trim()}
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? '⏳ Vérification...' : '✓ Valider'}
          </Button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setUseBackup(!useBackup);
              setCode('');
              setError('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: colors.primary,
              cursor: 'pointer',
              fontSize: '13px',
              textDecoration: 'underline',
              marginBottom: '8px',
              display: 'block',
              margin: '0 auto 8px',
            }}
          >
            {useBackup
              ? 'Utiliser l\'application à la place'
              : 'Utiliser un code de secours'}
          </button>

          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: colors.gray[500],
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            ← Annuler et revenir
          </button>
        </div>
      </Card>
    </div>
  );
};

export default TwoFactorLogin;
