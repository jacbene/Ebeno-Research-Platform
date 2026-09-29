import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1.0';
const EXPIRY_DAYS = 182; // 6 mois (CNIL)

interface ConsentState {
  necessary: true;
  analytics: boolean;
  thirdParty: boolean;
  timestamp: string;
  version: string;
}

const CookieConsentBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [thirdParty, setThirdParty] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ConsentState;
        const ageMs = Date.now() - new Date(parsed.timestamp).getTime();
        const maxAgeMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

        // Consentement valide : version identique + pas expiré
        if (parsed.version === CONSENT_VERSION && ageMs < maxAgeMs) {
          return;
        }
      } catch {
        // JSON corrompu → on redemande
      }
    }
    setVisible(true);
  }, []);

  const saveConsent = (state: Omit<ConsentState, 'timestamp' | 'version'>) => {
    const full: ConsentState = {
      ...state,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: full }));
    setVisible(false);
  };

  const acceptAll = () =>
    saveConsent({ necessary: true, analytics: true, thirdParty: true });

  const refuseAll = () =>
    saveConsent({ necessary: true, analytics: false, thirdParty: false });

  const saveCustom = () =>
    saveConsent({ necessary: true, analytics, thirdParty });

  if (!visible) return null;

  // Styles inline — zéro dépendance externe (Tailwind, styled-components)
  const bannerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e0e0e0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    padding: '16px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '14px',
    color: '#1a1a1a',
    lineHeight: 1.5,
  };

  const contentStyle: React.CSSProperties = {
    maxWidth: '1100px',
    margin: '0 auto',
  };

  const buttonBase: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    fontFamily: 'inherit',
  };

  const btnPrimary: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: '#4A6CF7',
    color: 'white',
  };

  const btnSecondary: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: '#e5e7eb',
    color: '#1a1a1a',
  };

  const btnGhost: React.CSSProperties = {
    ...buttonBase,
    backgroundColor: 'transparent',
    color: '#4A6CF7',
    border: '1px solid #d1d5db',
  };

  const linkStyle: React.CSSProperties = {
    color: '#4A6CF7',
    textDecoration: 'underline',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '12px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    marginBottom: '12px',
    fontSize: '14px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#1a1a1a',
  };

  return (
    <div style={bannerStyle} role="dialog" aria-label={t('legal.cookieBanner.ariaLabel')}>
      <div style={contentStyle}>
        {!showDetails ? (
          <>
            <p style={{ margin: 0 }}>
              {t('legal.cookieBanner.message')}{' '}
              <a href="/cookies" style={linkStyle}>
                {t('legal.cookieBanner.learnMore')}
              </a>
            </p>
            <div style={rowStyle}>
              <button onClick={acceptAll} style={btnPrimary}>
                {t('legal.cookieBanner.acceptAll')}
              </button>
              <button onClick={refuseAll} style={btnSecondary}>
                {t('legal.cookieBanner.refuseAll')}
              </button>
              <button onClick={() => setShowDetails(true)} style={btnGhost}>
                {t('legal.cookieBanner.customize')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 style={titleStyle}>{t('legal.cookieBanner.detailsTitle')}</h3>

            <label style={{ ...labelStyle, opacity: 0.6, cursor: 'not-allowed' }}>
              <input type="checkbox" checked disabled style={{ marginTop: '3px' }} />
              <span>
                <strong>{t('legal.cookieBanner.necessary')}</strong> — {t('legal.cookieBanner.necessaryDesc')}
              </span>
            </label>

            <label style={{ ...labelStyle, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>
                <strong>{t('legal.cookieBanner.analytics')}</strong> — {t('legal.cookieBanner.analyticsDesc')}
              </span>
            </label>

            <label style={{ ...labelStyle, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={thirdParty}
                onChange={(e) => setThirdParty(e.target.checked)}
                style={{ marginTop: '3px' }}
              />
              <span>
                <strong>{t('legal.cookieBanner.thirdParty')}</strong> — {t('legal.cookieBanner.thirdPartyDesc')}
              </span>
            </label>

            <div style={rowStyle}>
              <button onClick={saveCustom} style={btnPrimary}>
                {t('legal.cookieBanner.saveChoices')}
              </button>
              <button onClick={refuseAll} style={btnSecondary}>
                Tout refuser
              </button>
            </div>
          </>
        )}

        {/* Liens légaux — CNIL : accessibles depuis le bandeau */}
        <div
          style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #f0f0f0',
            fontSize: '12px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          <a href="/legal" style={linkStyle}>{t('legal.links.mentions')}</a>
          {' · '}
          <a href="/cookies" style={linkStyle}>{t('legal.links.cookies')}</a>
          {' · '}
          <a href="/privacy" style={linkStyle}>{t('legal.links.privacy')}</a>
          {' · '}
          <a href="/terms" style={linkStyle}>{t('legal.links.terms')}</a>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
