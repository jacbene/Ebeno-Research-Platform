import React, { useState, useEffect } from 'react';
import './CookieConsentBanner.css';

const COOKIE_CONSENT_KEY = 'ebeno_cookie_consent';

const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (consent !== 'true') {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
    // Ici, vous pourriez initialiser des services d'analyse comme Google Analytics
    // exemple: window.gtag('config', 'GA_MEASUREMENT_ID');
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'false');
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="cookie-consent-banner">
      <div className="cookie-consent-content">
        <p>
          Ce site utilise des cookies pour améliorer votre expérience. En cliquant sur "Accepter", vous consentez à l'utilisation de tous les cookies. Vous pouvez également refuser les cookies non essentiels en cliquant sur "Refuser".
        </p>
        <div className="cookie-consent-actions">
          <button onClick={handleAccept} className="cookie-btn accept-btn">Accepter</button>
          <button onClick={handleDecline} className="cookie-btn decline-btn">Refuser</button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
