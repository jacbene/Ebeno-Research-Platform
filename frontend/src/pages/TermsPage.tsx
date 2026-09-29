import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const TermsPage: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <LegalLanguageNotice />

      <h1>Conditions Générales d'Utilisation</h1>

      <h2>Article 1 — Objet</h2>
      <p>
        Les présentes CGU régissent l'accès et l'utilisation de la plateforme
        <strong> Ebeno Research Platform</strong>, service de recherche collaborative
        multilingue intégrant des outils d'IA (transcription, traduction, résumé,
        analyse).
      </p>

      <h2>Article 2 — Acceptation</h2>
      <p>
        L'utilisation de la plateforme implique l'acceptation pleine et entière des
        présentes CGU. Lors de l'inscription, l'utilisateur doit cocher la case
        d'acceptation. En cas de refus, l'utilisateur ne peut pas utiliser le service.
      </p>

      <h2>Article 3 — Accès au service</h2>
      <p>
        La plateforme est accessible 24h/24 et 7j/7, sauf interruption pour
        maintenance ou cas de force majeure. L'éditeur ne garantit pas une
        disponibilité absolue.
      </p>
      <p>
        L'inscription est réservée aux personnes majeures ou aux mineurs disposant
        d'une autorisation parentale.
      </p>

      <h2>Article 4 — Compte utilisateur</h2>
      <p>
        L'utilisateur s'engage à fournir des informations exactes et à maintenir la
        confidentialité de ses identifiants. Toute activité effectuée depuis son
        compte est réputée être de son fait.
      </p>
      <p>
        L'utilisateur peut supprimer son compte à tout moment via
        <strong> Paramètres → RGPD → Supprimer mon compte</strong>. La suppression
        est effective après un délai de grâce de 30 jours.
      </p>

      <h2>Article 5 — Contenus et propriété intellectuelle</h2>
      <p>
        L'utilisateur conserve la propriété intellectuelle des contenus qu'il
        upload ou crée sur la plateforme (documents, audios, textes, analyses).
      </p>
      <p>
        En uploadant un contenu, l'utilisateur accorde à l'éditeur une licence
        non exclusive, mondiale et gratuite pour héberger, traiter et afficher ce
        contenu dans le cadre strict du fonctionnement du service.
      </p>
      <p>
        L'utilisateur garantit détenir tous les droits nécessaires sur les contenus
        uploadés et qu'ils ne portent pas atteinte aux droits de tiers.
      </p>

      <h2>Article 6 — Utilisation acceptable</h2>
      <p>Il est interdit de :</p>
      <ul>
        <li>Uploader des contenus illégaux, diffamatoires ou haineux</li>
        <li>Utiliser la plateforme pour du spam, phishing ou fraude</li>
        <li>Contourner les mesures de sécurité (rate limiting, 2FA, CSP)</li>
        <li>Extraire massivement des données (scraping) sans autorisation</li>
        <li>Revendre ou sous-licencier l'accès à la plateforme</li>
      </ul>

      <h2>Article 7 — Services d'IA et limites</h2>
      <p>
        La plateforme intègre des services d'IA tiers (Deepgram, OpenAI, DeepSeek).
        Les résultats (transcriptions, traductions, résumés, analyses) sont fournis
        <strong> à titre indicatif</strong> et peuvent contenir des erreurs.
        L'utilisateur ne doit pas s'y fier pour des décisions critiques sans
        vérification humaine.
      </p>

      <h2>Article 8 — Responsabilité</h2>
      <p>L'éditeur ne saurait être tenu responsable :</p>
      <ul>
        <li>Des interruptions de service ou pertes de données (force majeure)</li>
        <li>Des erreurs produites par les services d'IA</li>
        <li>De l'usage fait par l'utilisateur des contenus générés</li>
        <li>Des dommages indirects résultant de l'utilisation de la plateforme</li>
      </ul>

      <h2>Article 9 — Modification des CGU</h2>
      <p>
        L'éditeur se réserve le droit de modifier les CGU à tout moment. Les
        utilisateurs seront informés par email ou notification 30 jours avant
        l'entrée en vigueur des modifications substantielles.
      </p>

      <h2>Article 10 — Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige sera soumis
        à la compétence exclusive des tribunaux français.
      </p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default TermsPage;
