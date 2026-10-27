import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const PolitiqueCookies: React.FC = () => {
  const year = new Date().getFullYear();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-transparent dark:border-gray-700">
        <LegalLanguageNotice />

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Politique de Cookies</h1>

        <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Qu'est-ce qu'un cookie ?</h2>
            <p>
              Un cookie est un petit fichier texte déposé sur votre terminal lors de la
              visite d'un site web. Il permet de reconnaître votre navigateur et de
              mémoriser vos préférences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Cookies strictement nécessaires</h2>
            <p>Indispensables au fonctionnement de la plateforme (pas de consentement requis) :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-gray-900 dark:text-white">authToken</strong> — authentification JWT (7 jours)</li>
              <li><strong className="text-gray-900 dark:text-white">auth-storage</strong> — préférences Zustand persistées</li>
              <li><strong className="text-gray-900 dark:text-white">i18nextLng</strong> — langue préférée (1 an)</li>
              <li><strong className="text-gray-900 dark:text-white">cookie_consent</strong> — mémorisation du consentement (6 mois)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. Cookies analytiques (consentement requis)</h2>
            <p>
              Sentry (monitoring d'erreurs, anonymisé). Vous pouvez refuser sans impact
              sur votre expérience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Cookies tiers</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-gray-900 dark:text-white">Cloudinary</strong> — preview et transformation d'images</li>
              <li><strong className="text-gray-900 dark:text-white">Socket.IO</strong> — connexion temps réel</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Gestion de votre consentement</h2>
            <p>
              Lors de votre première visite, un bandeau vous permet d'accepter, refuser
              ou personnaliser les cookies non essentiels. Vous pouvez modifier vos choix
              à tout moment. Votre choix est conservé 6 mois.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Paramétrage navigateur</h2>
            <p>
              Vous pouvez également configurer votre navigateur pour bloquer ou supprimer
              les cookies (Chrome, Firefox, Safari, Edge).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">7. Consentement multi-terminaux</h2>
            <p>
              Lorsque vous êtes authentifié, votre consentement peut s'appliquer à tous
              vos appareils connectés à ce compte. Modifiable par appareil dans vos
              paramètres.
            </p>
          </section>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-12">
          Dernière mise à jour : {year}
        </p>
      </div>
    </div>
  );
};

export default PolitiqueCookies;
