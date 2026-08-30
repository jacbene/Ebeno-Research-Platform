import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import TranscriptionPage from './pages/TranscriptionPage';
import TranscriptionList from './pages/TranscriptionList';
import CollaborationPage from './pages/CollaborationPage';
import TextUploadPage from './pages/TextUploadPage';
import SettingsPage from './pages/SettingsPage';
import ProjectDetail from './pages/ProjectDetail';
import { Layout } from './components/layout/Layout';
import { theme } from './theme';
import { Card } from './components/ui/Card';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// ============ COMPOSANT LOGIN ============
const Login: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin();
      } else {
        setError(data.message || 'Erreur de connexion');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur');
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
    }}>
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
          <h1 style={{ fontSize: theme.typography.fontSize.xxl, fontWeight: theme.typography.fontWeight.bold, color: colors.dark }}>
            🎓 Ebeno Research
          </h1>
          <p style={{ color: colors.gray[600] }}>Plateforme de recherche collaborative</p>
        </div>
        {error && (
          <div style={{
            backgroundColor: '#FEE2E2', color: colors.danger,
            padding: theme.spacing.md, borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md, textAlign: 'center'
          }}>
            ❌ {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test@test.com" required />
          <Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          <Button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Connexion...' : 'Se connecter'}</Button>
        </form>
        <p style={{ textAlign: 'center', marginTop: theme.spacing.md, fontSize: theme.typography.fontSize.sm, color: colors.gray[600] }}>
          Test: test@test.com / 123456
        </p>
      </Card>
    </div>
  );
};

// ============ APP PRINCIPALE ============
const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

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
  };

  return (
    <ThemeProvider>
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Router future={{ v7_relativeSplatPath: true }}>
          <ErrorBoundary>
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
          </ErrorBoundary>
        </Router>
      )}
    </ThemeProvider>
  );
};

export default App;
