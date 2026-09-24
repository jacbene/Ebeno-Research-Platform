// src/App.tsx
import React, { useState, useEffect, lazy, Suspense, startTransition } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { ThemeProvider } from './context/ThemeContext';
import { api } from './services/api';
import { Layout } from './components/layout/Layout';
import { theme } from './theme';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/ToastContainer';
import { LanguageProvider } from './context/LanguageContext';
import { useTranslation } from 'react-i18next';
import { useRTL } from './i18n/useRTL';
import TwoFactorLogin from './components/TwoFactorLogin';

// ============================================================
// LAZY-LOADED PAGES
// ============================================================
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const TranscriptionPage = lazy(() => import('./pages/TranscriptionPage'));
const TranscriptionList = lazy(() => import('./pages/TranscriptionList'));
const CollaborationPage = lazy(() => import('./pages/CollaborationPage'));
const TextUploadPage = lazy(() => import('./pages/TextUploadPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Register = lazy(() => import('./pages/Register'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CancelDeletionPage = lazy(() => import('./pages/CancelDeletionPage'));

// ============================================================
// LOADER
// ============================================================
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '60vh', color: '#666',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px', height: '40px',
        border: '3px solid #e0e0e0', borderTop: '3px solid #4A6CF7',
        borderRadius: '50%', margin: '0 auto 12px',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '14px' }}>Chargement…</div>
    </div>
  </div>
);

// ============================================================
// ✅ SENTRY FALLBACK — UI affichée quand React crashe
// ============================================================
const SentryFallback: React.FC<{ error: Error; resetError: () => void }> = ({ error, resetError }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', minHeight: '100vh', padding: '20px',
    textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif',
    background: 'linear-gradient(135deg, #4A6CF7 0%, #3651B5 100%)',
  }}>
    <div style={{
      background: 'white', padding: '40px 32px', borderRadius: '16px',
      maxWidth: '520px', width: '100%',
      boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>😵</div>
      <h1 style={{ fontSize: '22px', marginBottom: '12px', color: '#1a1a1a' }}>
        Oups, quelque chose s'est mal passé
      </h1>
      <p style={{ color: '#666', marginBottom: '24px', lineHeight: 1.6, fontSize: '14px' }}>
        L'erreur a été signalée automatiquement à notre équipe.
        Vous pouvez essayer de recharger la page.
      </p>
      <button
        onClick={() => {
          resetError();
          window.location.reload();
        }}
        style={{
          padding: '12px 24px', backgroundColor: '#4A6CF7', color: 'white',
          border: 'none', borderRadius: '8px', cursor: 'pointer',
          fontSize: '15px', fontWeight: 'bold', width: '100%',
        }}
      >
        🔄 Recharger la page
      </button>
      {process.env.NODE_ENV !== 'production' && (
        <pre style={{
          marginTop: '20px', padding: '12px', backgroundColor: '#f5f5f5',
          borderRadius: '6px', fontSize: '11px', textAlign: 'left',
          overflow: 'auto', maxHeight: '200px', color: '#c0392b',
        }}>
          {error.message}
        </pre>
      )}
    </div>
  </div>
);

// ============================================================
// GUARDS
// ============================================================
const PublicOnlyRoute: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
};

const PrivateRoute: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// ============================================================
// LOGIN (avec 2FA + email non vérifié)
// ============================================================
const Login: React.FC<{
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onRequires2FA: (tempToken: string) => void;
}> = ({ onLogin, onSwitchToRegister, onRequires2FA }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationEmail(null);
    setResendSuccess(false);
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });

      if (response.data.requires2FA && response.data.tempToken) {
        onRequires2FA(response.data.tempToken);
        return;
      }

      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLogin();
      } else {
        setError(response.data.message || 'Erreur de connexion');
      }
    } catch (err: any) {
      if (err.response?.status === 403 && err.response?.data?.requiresVerification) {
        setVerificationEmail(err.response.data.email || email);
        return;
      }
      // ✅ Compte en suppression programmée
if (err.response?.status === 403 && err.response?.data?.accountPendingDeletion) {
  setError(
    `${err.response.data.message} 📬 ${t('verifyEmail.spamHint')}`
  );
  return;
}
      const message =
        err.response?.data?.message || err.message || 'Erreur de connexion au serveur';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!verificationEmail) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: verificationEmail });
      setResendSuccess(true);
    } catch {
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

  if (verificationEmail) {
    return (
      <div style={wrapperStyle}>
        <Card style={{ maxWidth: '440px', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: theme.spacing.lg }}>
            <div style={{ fontSize: '56px', marginBottom: '8px' }}>📧</div>
            <h2 style={{ color: colors.dark, margin: '0 0 8px' }}>
              {t('verifyEmail.notVerifiedTitle')}
            </h2>
            <p style={{ color: colors.gray[600], margin: 0, fontSize: '14px' }}>
              {t('verifyEmail.notVerifiedMessage', { email: verificationEmail })}
            </p>
          </div>

          {resendSuccess ? (
            <div style={{
              backgroundColor: '#D1FAE5', color: '#065F46',
              padding: theme.spacing.md,
              borderRadius: theme.borderRadius.md,
              textAlign: 'center', fontSize: '14px',
            }}>
              ✅ {t('verifyEmail.resendSuccess')}
            </div>
          ) : (
            <Button onClick={handleResend} disabled={resending} style={{ width: '100%' }}>
              {resending ? t('verifyEmail.resendSending') : t('verifyEmail.resendButton')}
            </Button>
          )}

          <button
            type="button"
            onClick={() => { setVerificationEmail(null); setResendSuccess(false); }}
            style={{
              display: 'block', margin: `${theme.spacing.lg} auto 0`,
              background: 'none', border: 'none',
              color: colors.primary, fontWeight: 'bold',
              cursor: 'pointer', font: 'inherit', fontSize: '14px',
            }}
          >
            {t('verifyEmail.backToLogin')}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          <h1 style={{
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
            color: colors.dark,
          }}>
            🎓 {t('auth.appName')}
          </h1>
          <p style={{ color: colors.gray[600] }}>{t('auth.appTagline')}</p>
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
            label={t('auth.login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.login.emailPlaceholder')}
            required
          />
          <Input
            label={t('auth.login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.login.passwordPlaceholder')}
            required
          />
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>

          <div style={{ textAlign: 'right', marginTop: '-8px', marginBottom: theme.spacing.md }}>
            <Link
              to="/forgot-password"
              style={{
                color: colors.primary,
                fontSize: '13px',
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>
        </form>

        <p style={{
          textAlign: 'center', marginTop: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm, color: colors.gray[600],
        }}>
          {t('auth.login.noAccount')}{' '}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}
            style={{ color: colors.primary, fontWeight: 'bold', textDecoration: 'none' }}
          >
            {t('auth.login.registerLink')}
          </a>
        </p>
      </Card>
    </div>
  );
};

// ============================================================
// WRAPPER REGISTER (lazy)
// ============================================================
const RegisterWrapper: React.FC<{
  onRegister: () => void;
  onSwitchToLogin: () => void;
}> = ({ onRegister, onSwitchToLogin }) => {
  return <Register onRegister={onRegister} onSwitchToLogin={onSwitchToLogin} />;
};

// ============================================================
// ROUTES (avec Suspense global)
// ============================================================
const AppRoutes: React.FC<{
  isAuthenticated: boolean;
  user: any;
  onLogin: () => void;
  onLogout: () => void;
}> = ({ isAuthenticated, user, onLogin, onLogout }) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);

  const switchToRegister = () => {
    startTransition(() => setAuthMode('register'));
  };

  const switchToLogin = () => {
    startTransition(() => setAuthMode('login'));
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ✅ ROUTE PUBLIQUE — accessible connecté ou non */}
        <Route
          path="/verify-email"
          element={<VerifyEmailPage onVerified={onLogin} />}
        />

				<Route
 					 path="/cancel-deletion"
 					 element={<CancelDeletionPage />}
				/>

        {/* ✅ Reset password (token dans l'URL) */}
        <Route
          path="/reset-password"
          element={<ResetPasswordPage />}
        />

        {/* ✅ ROUTES PUBLIQUES */}
        <Route element={<PublicOnlyRoute isAuthenticated={isAuthenticated} />}>
          {/* ✅ Mot de passe oublié (public, hors utilisateurs connectés) */}
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/login"
            element={
              twoFactorToken ? (
                <TwoFactorLogin
                  tempToken={twoFactorToken}
                  onSuccess={() => {
                    startTransition(() => setTwoFactorToken(null));
                    onLogin();
                  }}
                  onCancel={() => startTransition(() => setTwoFactorToken(null))}
                />
              ) : authMode === 'login' ? (
                <Login
                  onLogin={onLogin}
                  onSwitchToRegister={switchToRegister}
                  onRequires2FA={(t) => startTransition(() => setTwoFactorToken(t))}
                />
              ) : (
                <RegisterWrapper
                  onRegister={onLogin}
                  onSwitchToLogin={switchToLogin}
                />
              )
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Route>

        {/* ✅ ROUTES PRIVÉES */}
        <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
          <Route element={<Layout user={user} onLogout={onLogout} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transcription" element={<TranscriptionPage />} />
            <Route path="/text-upload" element={<TextUploadPage />} />
            <Route path="/transcriptions" element={<TranscriptionList />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/collaboration" element={<CollaborationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

// ============================================================
// APP PRINCIPALE
// ============================================================
const App: React.FC = () => {
  useRTL();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        const parsed = JSON.parse(userStr);
        startTransition(() => {
          setUser(parsed);
          setIsAuthenticated(true);
          setBootstrapped(true);
        });
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setBootstrapped(true);
      }
    } else {
      setBootstrapped(true);
    }
  }, []);

  const handleLogin = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch { /* ignore */ }
    }
    startTransition(() => setIsAuthenticated(true));
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    startTransition(() => {
      setIsAuthenticated(false);
      setUser(null);
    });
  };

  if (!bootstrapped) {
    return (
      <ThemeProvider>
        <LanguageProvider>
          <PageLoader />
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <Router future={{ v7_relativeSplatPath: true }}>
            {/* ✅ DOUBLE PROTECTION : Sentry + ErrorBoundary custom */}
            <Sentry.ErrorBoundary fallback={SentryFallback} showDialog={false}>
              <ErrorBoundary>
                <AppRoutes
                  isAuthenticated={isAuthenticated}
                  user={user}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
              </ErrorBoundary>
            </Sentry.ErrorBoundary>
          </Router>
          <ToastContainer />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
