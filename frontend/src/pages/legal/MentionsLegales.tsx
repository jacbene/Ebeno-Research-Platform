import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const MentionsLegales: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <LegalLanguageNotice />

      <h1>Mentions Légales</h1>

      <h2>1. Éditeur</h2>
      <p>
        <strong>Ebeno Research Platform</strong><br />
        Jacques Bene<br />
        Email : contact@ebeno-research.com
      </p>

      <h2>2. Hébergement</h2>
      <p>
        Render Services, Inc. — 525 Brannan Street, San Francisco, CA 94107, USA
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        Le code, l'interface et les éléments graphiques sont la propriété exclusive
        de l'éditeur. Les contenus uploadés restent la propriété de leurs auteurs.
      </p>

      <h2>4. Données personnelles</h2>
      <p>
        Voir notre <a href="/privacy">Politique de Confidentialité</a>.
        Contact RGPD : privacy@ebeno-research.com
      </p>

      <h2>5. Droit applicable</h2>
      <p>Droit français.</p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default MentionsLegales;
