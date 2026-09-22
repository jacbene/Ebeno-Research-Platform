// src/App.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import TwoFactorLogin from './components/TwoFactorLogin';  // ✅ AJOUT 2FA

// ============================================================
// ✅ LAZY-LOADED PAGES
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

// ============================================================
// COMPOSANT FALLBACK
// ============================================================
const PageLoader: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    color: '#666',
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '3px solid #e0e0e0',
        borderTop: '3px solid #4A6CF7',
        borderRadius: '50%',
        margin: '0 auto 12px',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '14px' }}>Chargement…</div>
    </div>
  </div>
);

// ============================================================
// COMPOSANT LOGIN (avec support 2FA)
// ============================================================
const Login: React.FC<{
  onLogin: () => void;
  onSwitchToRegister: () => void;
  onRequires2FA: (tempToken: string) => void;   // ✅ AJOUT 2FA
}> = ({ onLogin, onSwitchToRegister, onRequires2FA }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });

      // ✅ 2FA requise : on bascule sur TwoFactorLogin
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
      const message =
        err.response?.data?.message || err.message || 'Erreur de connexion au serveur';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
      padding: '20px',
    }}>
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
            backgroundColor: '#FEE2E2',
            color: colors.danger,
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            textAlign: 'center',
            fontSize: '14px',
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
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: theme.spacing.lg,
          fontSize: theme.typography.fontSize.sm,
          color: colors.gray[600],
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

        <p style={{
          textAlign: 'center',
          marginTop: theme.spacing.md,
          fontSize: '11px',
          color: colors.gray[400],
        }}>
          {t('auth.login.testHint')}
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
// APP PRINCIPALE
// ============================================================
const App: React.FC = () => {
  useRTL();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);  // ✅ AJOUT 2FA

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogin = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) setUser(JSON.parse(userStr));
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    setAuthMode('login');
    setTwoFactorToken(null);  // ✅ Réinitialiser
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <Router future={{ v7_relativeSplatPath: true }}>
            {!isAuthenticated ? (
              // ✅ 2FA : si un tempToken est présent, on affiche TwoFactorLogin
              twoFactorToken ? (
                <TwoFactorLogin
                  tempToken={twoFactorToken}
                  onSuccess={() => {
                    setTwoFactorToken(null);
                    handleLogin();
                  }}
                  onCancel={() => {
                    setTwoFactorToken(null);
                  }}
                />
              ) : authMode === 'login' ? (
                <Login
                  onLogin={handleLogin}
                  onSwitchToRegister={() => setAuthMode('register')}
                  onRequires2FA={(tempToken) => setTwoFactorToken(tempToken)}
                />
              ) : (
                <Suspense fallback={<PageLoader />}>
                  <RegisterWrapper
                    onRegister={handleLogin}
                    onSwitchToLogin={() => setAuthMode('login')}
                  />
                </Suspense>
              )
            ) : (
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route element={<Layout user={user} onLogout={handleLogout} />}>
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
                  </Routes>
                </Suspense>
              </ErrorBoundary>
            )}
          </Router>

          <ToastContainer />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
