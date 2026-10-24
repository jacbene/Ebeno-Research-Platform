import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const MentionsLegales: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <LegalLanguageNotice />

      <h1>Mentions Légales</h1>

      <h2>1. Éditeur du site</h2>
      <p>
        <strong>Ebeno Research Platform</strong><br />
        Jacques Bene Mbama<br />
        Statut : Entrepreneur individuel (Sole Trader)<br />
        Localisation : Cameroun<br />
        Email : <a href="mailto:jacquesbene301@gmail.com">jacquesbene301@gmail.com</a>
      </p>

      <h2>2. Hébergement</h2>
      <p>
        <strong>Render Services, Inc.</strong><br />
        525 Brannan Street, San Francisco, CA 94107, USA<br />
        Site : <a href="https://render.com" target="_blank" rel="noopener noreferrer">render.com</a>
      </p>

      <h2>3. Paiement</h2>
      <p>
        Les paiements sont traités par <strong>Paddle.com Market Ltd</strong>, 
        agissant en qualité de revendeur officiel (Merchant of Record).<br />
        Paddle.com Market Ltd, Judd House, 18-29 Mora Street, London, EC1V 8BT, UK.
      </p>

      <h2>4. Propriété intellectuelle</h2>
      <p>
        Le code, l'interface et les éléments graphiques sont la propriété exclusive
        de l'éditeur. Les contenus uploadés par les utilisateurs restent la propriété 
        de leurs auteurs respectifs.
      </p>

      <h2>5. Données personnelles</h2>
      <p>
        Voir notre <a href="/privacy">Politique de Confidentialité</a>.<br />
        Contact RGPD : <a href="mailto:jacquesbene301@gmail.com">jacquesbene301@gmail.com</a>
      </p>

      <h2>6. Droit applicable</h2>
      <p>
        Le présent site est édité depuis le Cameroun. Les conditions de vente et 
        de paiement sont régies par les CGU de Paddle.com Market Ltd, notre 
        revendeur officiel.
      </p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default MentionsLegales;
