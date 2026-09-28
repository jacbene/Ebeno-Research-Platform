import React from 'react';

const PolitiqueCookies: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <h1>Politique de Cookies</h1>

      <h2>1. Qu'est-ce qu'un cookie ?</h2>
      <p>
        Un cookie est un petit fichier texte déposé sur votre terminal lors de la
        visite d'un site web. Il permet de reconnaître votre navigateur et de
        mémoriser vos préférences.
      </p>

      <h2>2. Cookies strictement nécessaires</h2>
      <p>
        Indispensables au fonctionnement de la plateforme (pas de consentement requis) :
      </p>
      <ul>
        <li><strong>authToken</strong> — authentification JWT (7 jours)</li>
        <li><strong>auth-storage</strong> — préférences Zustand persistées</li>
        <li><strong>i18nextLng</strong> — langue préférée (1 an)</li>
        <li><strong>cookie_consent</strong> — mémorisation du consentement (6 mois)</li>
      </ul>

      <h2>3. Cookies analytiques (consentement requis)</h2>
      <p>
        Sentry (monitoring d'erreurs, anonymisé). Vous pouvez refuser sans impact
        sur votre expérience.
      </p>

      <h2>4. Cookies tiers</h2>
      <ul>
        <li><strong>Cloudinary</strong> — preview et transformation d'images</li>
        <li><strong>Socket.IO</strong> — connexion temps réel</li>
      </ul>

      <h2>5. Gestion de votre consentement</h2>
      <p>
        Lors de votre première visite, un bandeau vous permet d'accepter, refuser
        ou personnaliser les cookies non essentiels. Vous pouvez modifier vos choix
        à tout moment. Votre choix est conservé 6 mois.
      </p>

      <h2>6. Paramétrage navigateur</h2>
      <p>
        Vous pouvez également configurer votre navigateur pour bloquer ou supprimer
        les cookies (Chrome, Firefox, Safari, Edge).
      </p>

      <h2>7. Consentement multi-terminaux (CNIL 2026)</h2>
      <p>
        Lorsque vous êtes authentifié, votre consentement peut s'appliquer à tous
        vos appareils connectés à ce compte. Modifiable par appareil dans vos
        paramètres.
      </p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default PolitiqueCookies;
