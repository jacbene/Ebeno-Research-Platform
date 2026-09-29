import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'install_banner_dismissed';
const DISMISS_DURATION_DAYS = 30;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    setIsIOS(iOS);

    // Déjà installé (mode standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Bannière rejetée récemment ?
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      const ageMs = Date.now() - new Date(dismissed).getTime();
      const maxAgeMs = DISMISS_DURATION_DAYS * 24 * 60 * 60 * 1000;
      if (ageMs < maxAgeMs) return;
    }

    // Android/Chrome : capter l'event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS : afficher après 3s (install manuelle)
    if (iOS) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      alert(
        t('install.iosInstructions', {
          defaultValue:
            "Appuyez sur le bouton Partager en bas de Safari, puis 'Sur l'écran d'accueil'.",
        })
      );
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  const bannerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9998,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e0e0e0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    padding: '12px 16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    color: '#1a1a1a',
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '1100px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  };

  const iconStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    flexShrink: 0,
    borderRadius: '8px',
    backgroundColor: '#f5f5f5',
    padding: '6px',
    boxSizing: 'border-box',
  };

  const textStyle: React.CSSProperties = {
    flex: 1,
    minWidth: '200px',
    lineHeight: 1.4,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 600,
    marginBottom: '2px',
    color: '#1a1a1a',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '13px',
    color: '#666',
  };

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    fontFamily: 'inherit',
    flexShrink: 0,
  };

  const btnInstall: React.CSSProperties = {
    ...btnBase,
    backgroundColor: '#4A6CF7',
    color: 'white',
  };

  const btnDismiss: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '18px',
    padding: '4px 10px',
  };

  return (
    <div
      style={bannerStyle}
      role="dialog"
      aria-label="Bannière d'installation"
    >
      <div style={contentStyle}>
        <img src="/vite.svg" alt="Ebeno" style={iconStyle} />
        <div style={textStyle}>
          <div style={titleStyle}>
            {t('install.title', { defaultValue: 'Installer Ebeno sur votre appareil' })}
          </div>
          <div style={subtitleStyle}>
            {t('install.subtitle', {
              defaultValue: 'Accès plus rapide, mode plein écran, notifications.',
            })}
          </div>
        </div>
        <button style={btnInstall} onClick={handleInstall}>
          {isIOS
            ? t('install.howTo', { defaultValue: 'Comment faire ?' })
            : t('install.install', { defaultValue: 'Installer' })}
        </button>
        <button
          style={btnDismiss}
          onClick={handleDismiss}
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default InstallBanner;
