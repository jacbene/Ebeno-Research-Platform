// frontend/src/pages/SettingsPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { theme } from '../theme';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { TwoFactorSetup } from '../components/TwoFactorSetup';

type Tab = 'profile' | 'security' | 'language' | 'appearance' | 'gdpr';

const SettingsPage: React.FC = () => {
  const { mode, toggleMode, colors, setCustomPalette } = useTheme();
  const { language, supportedLanguages, changeLanguage } = useLanguage();
  const toast = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
  const [savingLanguage, setSavingLanguage] = useState(false);

  // ✅ Export RGPD
  const [gdprCounts, setGdprCounts] = useState<any>(null);
  const [gdprLoading, setGdprLoading] = useState(false);
  const [gdprExporting, setGdprExporting] = useState(false);

  const [primaryColor, setPrimaryColor] = useState(colors.primary);
  const [primaryDark, setPrimaryDark] = useState(colors.primaryDark);
  const [primaryLight, setPrimaryLight] = useState(colors.primaryLight);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Charger les infos d'export RGPD quand on ouvre l'onglet
  useEffect(() => {
    if (activeTab !== 'gdpr' || gdprCounts) return;

    const loadGdprInfo = async () => {
      setGdprLoading(true);
      try {
        const res = await api.get('/users/me/export-info');
        if (res.data.success) {
          setGdprCounts(res.data.data.counts);
        }
      } catch (error) {
        console.error('❌ Erreur chargement info RGPD:', error);
      } finally {
        setGdprLoading(false);
      }
    };

    loadGdprInfo();
  }, [activeTab, gdprCounts]);

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
      toast.addToast({
        type: 'error',
        title: t('settings.errors.invalidFile'),
        message: t('settings.errors.onlyImages'),
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.addToast({
        type: 'error',
        title: t('settings.errors.fileTooBig'),
        message: t('settings.errors.fileTooBigMessage'),
      });
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

      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, avatar: newAvatarUrl }));

      toast.addToast({ type: 'success', title: t('settings.profile.avatarSuccess') });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('settings.errors.avatarUploadFailed'),
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

      toast.addToast({ type: 'success', title: t('settings.profile.success') });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('settings.errors.profileSaveFailed'),
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
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: t('settings.errors.passwordMismatch'),
      });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: t('settings.errors.passwordTooShort'),
      });
      return;
    }

    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      toast.addToast({ type: 'success', title: t('settings.security.success') });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('settings.errors.passwordChangeFailed'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // ============================================================
  // LANGUE
  // ============================================================
  const handleLanguageChange = async (code: string) => {
    if (code === language || savingLanguage) return;

    setSavingLanguage(true);
    try {
      await changeLanguage(code);
      const langLabel = supportedLanguages.find((l) => l.code === code)?.label || code;
      toast.addToast({
        type: 'success',
        title: t('settings.language.success'),
        message: t('settings.language.successMessage', { language: langLabel }),
      });
    } catch (error: any) {
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: t('settings.errors.languageChangeFailed'),
      });
    } finally {
      setSavingLanguage(false);
    }
  };

  // ============================================================
  // APPARENCE
  // ============================================================
  const applyCustomPalette = () => {
    const palette = { primary: primaryColor, primaryDark, primaryLight };
    setCustomPalette(palette);
    localStorage.setItem('customPalette', JSON.stringify(palette));
    toast.addToast({ type: 'success', title: t('settings.appearance.applied') });
  };

  const resetPalette = () => {
    setCustomPalette(null);
    localStorage.removeItem('customPalette');
    setPrimaryColor('#4A6CF7');
    setPrimaryDark('#3651B5');
    setPrimaryLight('#6B8AFF');
    toast.addToast({ type: 'info', title: t('settings.appearance.resetDone') });
  };

  // ============================================================
  // EXPORT RGPD
  // ============================================================
  const handleExportGdpr = async () => {
    setGdprExporting(true);
    try {
      const response = await api.get('/users/me/export-data', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers['content-disposition'];
      const fileName =
        contentDisposition?.split('filename=')[1]?.replace(/"/g, '') ||
        `ebeno_export_${Date.now()}.json`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.addToast({ type: 'success', title: t('gdpr.success') });
    } catch (error: any) {
      console.error('❌ Erreur export RGPD:', error);
      toast.addToast({
        type: 'error',
        title: t('common.error'),
        message: error.response?.data?.message || t('gdpr.error'),
      });
    } finally {
      setGdprExporting(false);
    }
  };

  // Helpers
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>{t('settings.loading')}</div>;
  }

  // ✅ Onglets traduits (avec GDPR)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: t('settings.tabs.profile') },
    { key: 'security', label: t('settings.tabs.security') },
    { key: 'language', label: t('settings.tabs.language') },
    { key: 'appearance', label: t('settings.tabs.appearance') },
    { key: 'gdpr', label: t('gdpr.tab') },
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ marginBottom: theme.spacing.lg }}>{t('settings.title')}</h1>

      {/* Onglets */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing.sm,
          marginBottom: theme.spacing.lg,
          borderBottom: `1px solid ${colors.gray[200]}`,
          flexWrap: 'wrap',
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
        <Card title={t('settings.profile.title')}>
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
                  {uploadingAvatar ? t('settings.profile.uploading') : t('settings.profile.changePhoto')}
                </Button>
              </div>
            </div>
          </div>

          <form onSubmit={saveProfile}>
            <Input
              label={t('settings.profile.nameLabel')}
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              required
            />

            <Input
              label={t('settings.profile.emailLabel')}
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              required
            />

            <Input
              label={t('settings.profile.institutionLabel')}
              type="text"
              value={profileData.institution}
              onChange={(e) => setProfileData({ ...profileData, institution: e.target.value })}
              placeholder={t('settings.profile.institutionPlaceholder')}
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
                {t('settings.profile.bioLabel')}
              </label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                placeholder={t('settings.profile.bioPlaceholder')}
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
              {savingProfile ? t('settings.profile.saving') : t('settings.profile.save')}
            </Button>
          </form>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET SÉCURITÉ */}
      {/* ============================================================ */}
      {activeTab === 'security' && (
        <Card title={t('settings.security.title')}>
          <form onSubmit={changePassword}>
            <Input
              label={t('settings.security.currentPassword')}
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder={t('settings.security.currentPasswordPlaceholder')}
              required
            />

            <Input
              label={t('settings.security.newPassword')}
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder={t('settings.security.newPasswordPlaceholder')}
              required
            />

            <Input
              label={t('settings.security.confirmPassword')}
              type="password"
              value={passwordData.confirmNewPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmNewPassword: e.target.value })}
              placeholder={t('settings.security.confirmPasswordPlaceholder')}
              required
            />

            <Button
              type="submit"
              disabled={savingPassword}
              style={{ marginTop: theme.spacing.md }}
            >
              {savingPassword ? t('settings.security.submitting') : t('settings.security.submit')}
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
            <strong>{t('settings.security.recommendations')}</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
              <li>{t('settings.security.recommendation1')}</li>
              <li>{t('settings.security.recommendation2')}</li>
              <li>{t('settings.security.recommendation3')}</li>
            </ul>
          </div>
{/* ✅ Section 2FA */}
<div
  style={{
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTop: `1px solid ${colors.gray[200]}`,
  }}
>
  <h4 style={{ marginTop: 0, marginBottom: '12px', color: colors.dark }}>
    🔐 Authentification à deux facteurs (2FA)
  </h4>
  <TwoFactorSetup />
</div>          
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET LANGUE */}
      {/* ============================================================ */}
      {activeTab === 'language' && (
        <Card title={t('settings.language.title')}>
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: colors.gray[600],
              lineHeight: 1.6,
            }}
          >
            {t('settings.language.intro')}
          </p>

          <ul
            style={{
              margin: '0 0 24px 0',
              paddingLeft: '20px',
              fontSize: '13px',
              color: colors.gray[600],
              lineHeight: 1.8,
            }}
          >
            <li>{t('settings.language.feature1')}</li>
            <li>{t('settings.language.feature2')}</li>
            <li>{t('settings.language.feature3')}</li>
            <li>{t('settings.language.feature4')}</li>
          </ul>

          <h4 style={{ marginBottom: '12px', fontSize: '15px', color: colors.dark }}>
            {t('settings.language.activeLabel')}
          </h4>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '10px',
            }}
          >
            {supportedLanguages.map((lang) => {
              const isActive = language === lang.code;

              return (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  disabled={savingLanguage}
                  style={{
                    padding: '14px 16px',
                    border: `2px solid ${isActive ? colors.primary : colors.gray[300]}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: isActive ? `${colors.primary}12` : colors.white,
                    color: isActive ? colors.primary : colors.dark,
                    fontWeight: isActive ? 'bold' : 'normal',
                    cursor: savingLanguage ? 'wait' : 'pointer',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                    opacity: savingLanguage && !isActive ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive && !savingLanguage) {
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = colors.gray[300];
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  <span style={{ fontSize: '24px', lineHeight: 1 }}>{lang.flag}</span>
                  <span style={{ flex: 1 }}>{lang.label}</span>
                  {isActive && (
                    <span
                      style={{
                        fontSize: '16px',
                        color: colors.primary,
                        fontWeight: 'bold',
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {savingLanguage && (
            <div
              style={{
                marginTop: '16px',
                fontSize: '13px',
                color: colors.gray[600],
                textAlign: 'center',
              }}
            >
              {t('settings.language.saving')}
            </div>
          )}

          <div
            style={{
              marginTop: '24px',
              padding: '12px 16px',
              backgroundColor: `${colors.primary}10`,
              borderLeft: `3px solid ${colors.primary}`,
              borderRadius: theme.borderRadius.md,
              fontSize: '13px',
              color: colors.gray[700],
              lineHeight: 1.6,
            }}
          >
            <strong>{t('settings.language.aboutTitle')}</strong>
            <p style={{ margin: '6px 0 0 0' }}>
              {t('settings.language.aboutText')}
            </p>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET APPARENCE */}
      {/* ============================================================ */}
      {activeTab === 'appearance' && (
        <Card title={t('settings.appearance.title')}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <span>{mode === 'light' ? t('settings.appearance.modeLight') : t('settings.appearance.modeDark')}</span>
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
              {mode === 'light' ? t('settings.appearance.activateDark') : t('settings.appearance.activateLight')}
            </button>
          </div>

          <h4 style={{ marginTop: '20px' }}>{t('settings.appearance.customColors')}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label>{t('settings.appearance.primaryColor')}</label>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label>{t('settings.appearance.primaryDark')}</label>
              <input
                type="color"
                value={primaryDark}
                onChange={(e) => setPrimaryDark(e.target.value)}
                style={{ width: '100%', height: '40px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label>{t('settings.appearance.primaryLight')}</label>
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
              {t('settings.appearance.apply')}
            </Button>
            <Button variant="outline" onClick={resetPalette}>
              {t('settings.appearance.reset')}
            </Button>
          </div>
        </Card>
      )}

      {/* ============================================================ */}
      {/* ONGLET RGPD — Mes données */}
      {/* ============================================================ */}
      {activeTab === 'gdpr' && (
        <Card title={t('gdpr.title')}>
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: colors.gray[600],
              lineHeight: 1.6,
            }}
          >
            {t('gdpr.intro')}
          </p>

          {/* Volume de données */}
          <div
            style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: colors.gray[50] || '#fafafa',
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${colors.gray[200]}`,
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', color: colors.dark }}>
              {t('gdpr.countsTitle')}
            </h4>

            {gdprLoading ? (
              <p style={{ margin: 0, fontSize: '13px', color: colors.gray[500] }}>
                {t('gdpr.loadingCounts')}
              </p>
            ) : gdprCounts ? (
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  fontSize: '13px',
                  color: colors.dark,
                }}
              >
                <span>
                  📁 <strong>{gdprCounts.projects}</strong> {t('gdpr.countProjects')}
                </span>
                <span>
                  🎙️ <strong>{gdprCounts.transcriptions}</strong>{' '}
                  {t('gdpr.countTranscriptions')}
                </span>
                <span>
                  📝 <strong>{gdprCounts.memos}</strong> {t('gdpr.countMemos')}
                </span>
                <span>
                  📎 <strong>{gdprCounts.files}</strong> {t('gdpr.countFiles')}
                </span>
                <span>
                  🏷️ <strong>{gdprCounts.codes}</strong> {t('gdpr.countCodes')}
                </span>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: colors.gray[500] }}>
                {t('gdpr.loadingInfo')}
              </p>
            )}
          </div>

          {/* Contenu / Exclusions */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                padding: '14px',
                backgroundColor: `${colors.success}10`,
                borderLeft: `3px solid ${colors.success}`,
                borderRadius: theme.borderRadius.md,
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.dark }}>
                {t('gdpr.includes')}
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: colors.gray[700],
                  lineHeight: 1.7,
                }}
              >
                <li>{t('gdpr.include1')}</li>
                <li>{t('gdpr.include2')}</li>
                <li>{t('gdpr.include3')}</li>
                <li>{t('gdpr.include4')}</li>
                <li>{t('gdpr.include5')}</li>
                <li>{t('gdpr.include6')}</li>
              </ul>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: `${colors.danger}10`,
                borderLeft: `3px solid ${colors.danger}`,
                borderRadius: theme.borderRadius.md,
              }}
            >
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: colors.dark }}>
                {t('gdpr.excludes')}
              </h4>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: colors.gray[700],
                  lineHeight: 1.7,
                }}
              >
                <li>{t('gdpr.exclude1')}</li>
                <li>{t('gdpr.exclude2')}</li>
                <li>{t('gdpr.exclude3')}</li>
              </ul>
            </div>
          </div>

          {/* Bouton de téléchargement */}
          <Button
            variant="primary"
            onClick={handleExportGdpr}
            disabled={gdprExporting}
            style={{ padding: '12px 24px', fontSize: '14px' }}
          >
            {gdprExporting ? t('gdpr.downloading') : t('gdpr.downloadButton')}
          </Button>

          <p
            style={{
              marginTop: '12px',
              fontSize: '12px',
              color: colors.gray[500],
              fontStyle: 'italic',
            }}
          >
            {t('gdpr.note')}
          </p>
        </Card>
      )}
    </div>
  );
};

export default SettingsPage;
