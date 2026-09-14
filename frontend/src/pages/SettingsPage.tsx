import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { theme } from '../theme';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

type Tab = 'profile' | 'security' | 'appearance';

const SettingsPage: React.FC = () => {
  const { mode, toggleMode, colors, setCustomPalette } = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // Utilisateur courant
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Formulaires
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    bio: '',
    institution: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Couleurs personnalisées
  const [primaryColor, setPrimaryColor] = useState(colors.primary);
  const [primaryDark, setPrimaryDark] = useState(colors.primaryDark);
  const [primaryLight, setPrimaryLight] = useState(colors.primaryLight);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger le profil
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        const u = res.data.user || res.data;
        setUser(u);
        setProfileData({
          name: u.name || '',
          email: u.email || '',
          bio: u.bio || '',
          institution: u.institution || '',
        });
      } catch (error) {
        console.error('❌ Erreur chargement profil:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // ============================================================
  // AVATAR
  // ============================================================
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.addToast({ type: 'error', title: 'Fichier invalide', message: 'Seules les images sont autorisées' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.addToast({ type: 'error', title: 'Fichier trop volumineux', message: 'Maximum 5 MB' });
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newAvatarUrl = res.data.avatar;
      setUser((prev: any) => ({ ...prev, avatar: newAvatarUrl }));

      // Mettre à jour localStorage
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, avatar: newAvatarUrl }));

      toast.addToast({ type: 'success', title: 'Avatar mis à jour ✅' });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible d\'uploader l\'avatar',
      });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // PROFIL
  // ============================================================
  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/auth/update', {
        name: profileData.name,
        email: profileData.email,
        bio: profileData.bio,
        institution: profileData.institution,
      });

      setUser(res.data.user);
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, ...res.data.user }));

      toast.addToast({ type: 'success', title: 'Profil mis à jour ✅' });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de sauvegarder',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // ============================================================
  // MOT DE PASSE
  // ============================================================
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      toast.addToast({ type: 'error', title: 'Erreur', message: 'Les mots de passe ne correspondent pas' });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.addToast({ type: 'error', title: 'Erreur', message: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      toast.addToast({ type: 'success', title: 'Mot de passe changé ✅' });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: 'Erreur',
        message: error.response?.data?.message || 'Impossible de changer le mot de passe',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // ============================================================
  // APPARENCE
  // ============================================================
  const applyCustomPalette = () => {
    const palette = { primary: primaryColor, primaryDark, primaryLight };
    setCustomPalette(palette);
    localStorage.setItem('customPalette', JSON.stringify(palette));
    toast.addToast({ type: 'success', title: 'Palette appliquée ✅' });
  };

  const resetPalette = () => {
    setCustomPalette(null);
    localStorage.removeItem('customPalette');
    setPrimaryColor('#4A6CF7');
    setPrimaryDark('#3651B5');
    setPrimaryLight('#6B8AFF');
    toast.addToast({ type: 'info', title: 'Palette réinitialisée' });
  };

  // Helpers
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Chargement du profil...</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: '👤 Profil' },
    { key: 'security', label: '🔒 Sécurité' },
    { key: 'appearance', label: '🎨 Apparence' },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: theme.spacing.lg }}>⚙️ Paramètres</h1>

      {/* Onglets */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
          borderBottom: `1px solid ${colors.gray[200]}`,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: theme.typography.fontSize.md,
              fontWeight: activeTab === tab.key ? 'bold' : 'normal',
              color: activeTab === tab.key ? colors.primary : colors.gray[600],
              borderBottom: activeTab === tab.key ? `2px solid ${colors.primary}` : 'none',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================ */}
      {/* ONGLET PROFIL */}
      {/* ============================================================ */}
      {activeTab === 'profile' && (
        <Card title="👤 Mon profil">
          {/* Avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              paddingBottom: theme.spacing.lg,
              borderBottom: `1px solid ${colors.gray[200]}`,
            }}
          >
            <div style={{ position: 'relative' }}>
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: `3px solid ${colors.primary}`,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    backgroundColor: colors.primary,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    border: `3px solid ${colors.primary}`,
                  }}
                >
                  {getInitials(user?.name || '')}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 4px 0' }}>{user?.name}</h3>
              <p style={{ margin: 0, color: colors.gray[600], fontSize: '14px' }}>
                {user?.email}
              </p>
              {user?.institution && (
                <p style={{ margin: '4px 0 0 0', color: colors.gray[500], fontSize: '13px' }}>
                  🏛️ {user.institution}
                </p>
              )}

              <div style={{ marginTop: '12px' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? '⏳ Upload...' : '📷 Changer la photo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Formulaire profil */}
          <form onSubmit={saveProfile}>
            <Input
              label="Nom complet"
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <Input
              label="Email"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
            />

            <Input
              label="Institution"
              type="text"
              value={profileData.institution}
              onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
              placeholder="Ex: Université de Paris"
            />

            <div style={{ marginTop: theme.spacing.md }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '4px',
                  fontSize: '14px',
                  color: colors.gray[700],
                }}
              >
                Bio
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder="Quelques mots sur vous..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: theme.borderRadius.md,
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={savingProfile}
              style={{ marginTop: theme.spacing.md }}
            >
              {savingProfile ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </form>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET SÉCURITÉ */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <Card title="🔒 Sécurité">
          <form onSubmit={changePassword}>
            <Input
              label="Mot de passe actuel"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="Votre mot de passe actuel"
              required
            />

            <Input
              label="Nouveau mot de passe"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="Au moins 6 caractères"
              required
            />

            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={passwordData.confirmNewPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
              placeholder="Retapez le nouveau mot de passe"
              required
            />

            <Button
              type="submit"
              disabled={savingPassword}
              style={{ marginTop: theme.spacing.md }}
            >
              {savingPassword ? 'Modification...' : 'Changer le mot de passe'}
            </Button>
          </form>

          <div
            style={{
              marginTop: theme.spacing.xl,
              padding: theme.spacing.md,
              backgroundColor: '#fff3cd',
              borderLeft: `3px solid #ffc107`,
              borderRadius: theme.borderRadius.md,
              fontSize: '13px',
              color: '#856404',
            }}
          >
            ⚠️ <strong>Recommandations de sécurité</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>Utilisez un mot de passe unique et complexe (8+ caractères)</li>
              <li>Ne partagez jamais votre mot de passe</li>
              <li>Changez-le régulièrement</li>
            </ul>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET APPARENCE */}
      {/* ============================================================ */}
      {activeTab === 'appearance' && (
        <Card title="🎨 Apparence">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <span>Mode {mode === 'light' ? '☀️ Clair' : '🌙 Sombre'}</span>
            <button
              onClick={toggleMode}
              style={{
                padding: '8px 16px',
                backgroundColor: mode === 'light' ? '#333' : '#f0f0f0',
                color: mode === 'light' ? 'white' : '#333',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              {mode === 'light' ? 'Activer le sombre' : 'Activer le clair'}
            </button>
          </div>

          <h4 style={{ marginTop: '20px' }}>Couleurs personnalisées</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label>Couleur primaire</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label>Primaire sombre</label>
              <input
                type="color"
                value={primaryDark}
                onChange={(e) => setPrimaryDark(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label>Primaire clair</label>
              <input
                type="color"
                value={primaryLight}
                onChange={(e) => setPrimaryLight(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <Button variant="primary" onClick={applyCustomPalette}>
              Appliquer
            </Button>
            <Button variant="outline" onClick={resetPalette}>
              Réinitialiser
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
