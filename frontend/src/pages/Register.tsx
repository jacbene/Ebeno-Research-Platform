// src/pages/Register.tsx
import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../theme';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';

interface RegisterProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

const Register: React.FC<RegisterProps> = ({ onRegister, onSwitchToLogin }) => {
  const { colors } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    institution: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ NOUVEAU : état "email envoyé, en attente de vérification"
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validate = (): string | null => {
    if (!formData.name.trim()) return 'Le nom est requis';
    if (!formData.email.trim()) return 'L\'email est requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Format d\'email invalide';
    if (formData.password.length < 6) return 'Le mot de passe doit contenir au moins 6 caractères';
    if (formData.password !== formData.confirmPassword) return 'Les mots de passe ne correspondent pas';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        institution: formData.institution.trim() || undefined,
      });

      // ✅ NOUVEAU : le compte nécessite une vérification email
      if (response.data.requiresVerification) {
        setRegisteredEmail(response.data.email || formData.email.trim().toLowerCase());
        return;
      }

      // Fallback : ancien comportement (si backend renvoie un token direct)
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onRegister();
      } else {
        setError(response.data.message || 'Erreur lors de l\'inscription');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    setResendSuccess(false);
    try {
      await api.post('/auth/resend-verification', { email: registeredEmail });
      setResendSuccess(true);
    } catch {
      // Anti-énumération : toujours succès
      setResendSuccess(true);
    } finally {
      setResending(false);
    }
  };

  const wrapperStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    padding: '20px',
  };

  // ─── Vue : email envoyé, en attente de vérification ────────
  if (registeredEmail) {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '480px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
            <div style={{ fontSize: '64px', marginBottom: '8px' }}>📧</div>
            <h2 style={{ color: colors.dark, margin: '0 0 12px' }}>
              Vérifiez votre boîte mail
            </h2>
            <p style={{ color: colors.gray[600], margin: '0 0 8px', fontSize: '15px', lineHeight: 1.6 }}>
              Un email de confirmation vous a été envoyé à
              <br />
              <strong style={{ color: colors.dark }}>{registeredEmail}</strong>
            </p>
            <p style={{ color: colors.gray[500] || colors.gray[600], margin: 0, fontSize: '13px' }}>
              Cliquez sur le lien pour activer votre compte.<br />
              Le lien est valable 24 heures. Vérifiez vos spams.
            </p>
          </div>

          {resendSuccess ? (
            <div style={{
              backgroundColor: '#D1FAE5', color: '#065F46',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              textAlign: 'center', fontSize: '14px',
            }}>
              ✅ Nouvel email envoyé
            </div>
          ) : (
            <Button
              onClick={handleResend}
              disabled={resending}
              style={{ width: '100%' }}
            >
              {resending ? 'Envoi...' : '📧 Renvoyer l\'email'}
            </Button>
          )}

          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              display: 'block', margin: `${theme.spacing.lg} auto 0`,
              background: 'none', border: 'none',
              color: colors.primary, fontWeight: 'bold',
              cursor: 'pointer', font: 'inherit', fontSize: '14px',
            }}
          >
            ← Retour à la connexion
          </button>
        </Card>
      </div>
    );
  }

  // ─── Vue : formulaire d'inscription ───────────────────────
  return (
    <div style={wrapperStyle}>
      <Card style={{ maxWidth: '480px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          <h1 style={{
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
            color: colors.dark, margin: 0,
          }}>
            🎓 Ebeno Research
          </h1>
          <p style={{ color: colors.gray[600], marginTop: '8px' }}>
            Créez votre compte de chercheur
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
            label="Nom complet *"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Marie Dupont"
            required
          />
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="marie.dupont@universite.fr"
            required
          />
          <Input
            label="Institution (optionnel)"
            type="text"
            value={formData.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            placeholder="Université de Paris"
          />
          <Input
            label="Mot de passe *"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="Au moins 6 caractères"
            required
          />
          <Input
            label="Confirmer le mot de passe *"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            placeholder="Retapez le mot de passe"
            required
          />
          <Button
            type="submit"
            disabled={loading}
            style={{ width: '100%', marginTop: theme.spacing.md }}
          >
            {loading ? 'Création du compte...' : 'Créer mon compte'}
          </Button>
        </form>

        <p style={{
          textAlign: 'center', marginTop: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm, color: colors.gray[600],
        }}>
          Déjà un compte ?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', color: colors.primary,
              fontWeight: 'bold', textDecoration: 'underline', font: 'inherit',
            }}
          >
            Se connecter
          </button>
        </p>
      </Card>
    </div>
  );
};

export default Register;
