import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const PrivacyPage: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <LegalLanguageNotice />

      <h1>Politique de Confidentialité</h1>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>Ebeno Research Platform</strong><br />
        Jacques Bene Mbama<br />
        Localisation : Cameroun<br />
        Contact : <a href="mailto:jacquesbene301@gmail.com">jacquesbene301@gmail.com</a>
      </p>

      <h2>2. Données collectées</h2>
      <p>
        Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme :
      </p>
      <ul>
        <li>Données d'identification (email, nom, avatar)</li>
        <li>Données de vos projets de recherche (documents, transcriptions, memos)</li>
        <li>Données de facturation (gérées par Paddle, jamais stockées chez nous)</li>
        <li>Logs techniques (adresse IP, actions d'audit) pour la sécurité</li>
      </ul>

      <h2>3. Finalité du traitement</h2>
      <p>
        Vos données sont utilisées pour fournir le service Ebeno, améliorer la 
        plateforme, assurer la sécurité et respecter nos obligations légales. 
        Nous ne vendons jamais vos données à des tiers.
      </p>

      <h2>4. Vos droits (RGPD)</h2>
      <p>
        Conformément au RGPD, vous disposez des droits suivants :
      </p>
      <ul>
        <li><strong>Droit d'accès</strong> : consulter vos données</li>
        <li><strong>Droit de rectification</strong> : corriger vos données</li>
        <li><strong>Droit à l'effacement</strong> : supprimer votre compte (délai de 30 jours)</li>
        <li><strong>Droit à la portabilité</strong> : exporter vos données (JSON)</li>
      </ul>
      <p>
        Pour exercer ces droits, contactez-nous à : 
        <a href="mailto:jacquesbene301@gmail.com"> jacquesbene301@gmail.com</a>
      </p>

      <h2>5. Autorité de contrôle</h2>
      <p>
        Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir 
        l'autorité de protection des données compétente. L'éditeur étant basé au Cameroun, 
        vous pouvez également vous référer aux principes du RGPD européen qui s'appliquent 
        à nos utilisateurs européens.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Voir notre <a href="/cookies">Politique de Cookies</a>.
      </p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default PrivacyPage;
