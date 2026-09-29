import React from 'react';
import LegalLanguageNotice from '../components/LegalLanguageNotice';

const PrivacyPage: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem', lineHeight: 1.6 }}>
      <LegalLanguageNotice />

      <h1>Politique de Confidentialité</h1>
      <p style={{ fontSize: '0.9rem', color: '#666' }}>
        Conformément aux articles 12, 13 et 14 du RGPD (UE 2016/679).
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        <strong>Ebeno Research Platform</strong><br />
        Jacques Bene<br />
        Email : privacy@ebeno-research.com
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li><strong>Compte :</strong> nom, email (chiffré AES-256-GCM), mot de passe (bcrypt), langue, avatar, statut 2FA</li>
        <li><strong>Projets :</strong> documents, audios, textes, mémos, commentaires, analyses</li>
        <li><strong>IA :</strong> transcriptions, traductions, résumés</li>
        <li><strong>Technique :</strong> IP, navigateur, logs d'accès, endpoint push</li>
      </ul>

      <h2>3. Finalités et bases légales</h2>
      <ul>
        <li>Fourniture du service — <em>exécution du contrat (art. 6.1.b)</em></li>
        <li>Transcription / traduction / résumé IA — <em>exécution du contrat</em></li>
        <li>Emails transactionnels — <em>exécution du contrat</em></li>
        <li>Sécurité, anti-fraude — <em>intérêt légitime (art. 6.1.f)</em></li>
        <li>Analytics anonymisé — <em>consentement (art. 6.1.a)</em></li>
        <li>Obligations légales — <em>art. 6.1.c</em></li>
      </ul>
      <p>Nous ne vendons ni ne partageons vos données à des fins publicitaires.</p>

      <h2>4. Destinataires (sous-traitants)</h2>
      <ul>
        <li><strong>Render</strong> — hébergement (UE/USA)</li>
        <li><strong>Cloudinary</strong> — stockage fichiers (USA)</li>
        <li><strong>Brevo</strong> — emails (France/UE)</li>
        <li><strong>Deepgram, OpenAI (Whisper)</strong> — transcription (USA)</li>
        <li><strong>DeepSeek</strong> — résumés, traductions (Chine)</li>
        <li><strong>Sentry</strong> — monitoring erreurs (USA/UE)</li>
      </ul>

      <h2>5. Transferts hors UE</h2>
      <p>
        Encadrés par les Clauses Contractuelles Types (CCT) de la Commission
        européenne et/ou le EU-US Data Privacy Framework. Un consentement
        explicite peut être demandé pour les traitements via DeepSeek.
      </p>

      <h2>6. Durées de conservation</h2>
      <ul>
        <li>Compte : jusqu'à suppression + 30 jours de grâce</li>
        <li>Projets / documents : jusqu'à suppression par l'utilisateur</li>
        <li>Logs d'audit : 365 jours (purge automatique)</li>
        <li>Corbeille : 90 jours</li>
        <li>Logs IP : 12 mois maximum</li>
      </ul>

      <h2>7. Vos droits (RGPD)</h2>
      <ul>
        <li><strong>Accès (art. 15)</strong> — copie de vos données</li>
        <li><strong>Rectification (art. 16)</strong> — corriger vos données</li>
        <li><strong>Effacement (art. 17)</strong> — via Paramètres → RGPD</li>
        <li><strong>Limitation (art. 18)</strong></li>
        <li><strong>Portabilité (art. 20)</strong> — export via Paramètres → RGPD</li>
        <li><strong>Opposition (art. 21)</strong></li>
      </ul>
      <p>
        Contact : <strong>privacy@ebeno-research.com</strong><br />
        Réclamation CNIL : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>
      </p>

      <h2>8. Sécurité</h2>
      <ul>
        <li>Chiffrement AES-256-GCM des champs sensibles</li>
        <li>Hachage bcrypt des mots de passe</li>
        <li>2FA TOTP disponible</li>
        <li>HTTPS obligatoire (HSTS), CSP stricte</li>
        <li>Rate limiting, audit log, anti-SSRF</li>
      </ul>

      <h2>9. Cookies</h2>
      <p>Voir notre <a href="/cookies">Politique de Cookies</a>.</p>

      <h2>10. Modifications</h2>
      <p>
        Toute modification substantielle sera notifiée par email ou notification
        dans l'application.
      </p>

      <p style={{ fontSize: '0.875rem', color: '#666', marginTop: '3rem' }}>
        Dernière mise à jour : {year}
      </p>
    </div>
  );
};

export default PrivacyPage;
