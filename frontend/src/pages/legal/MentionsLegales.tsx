import React from 'react';
import LegalLanguageNotice from '../../components/LegalLanguageNotice';

const MentionsLegales: React.FC = () => {
  const year = new Date().getFullYear();
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-transparent dark:border-gray-700">
        <LegalLanguageNotice />

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Mentions Légales</h1>

        <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Éditeur du site</h2>
            <p>
              <strong className="text-gray-900 dark:text-white">Ebeno Research Platform</strong><br />
              Jacques Bene Mbama<br />
              Statut : Entrepreneur individuel (Sole Trader)<br />
              Localisation : Cameroun<br />
              Email : <a href="mailto:jacquesbene301@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">jacquesbene301@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Hébergement</h2>
            <p>
              <strong className="text-gray-900 dark:text-white">Render Services, Inc.</strong><br />
              525 Brannan Street, San Francisco, CA 94107, USA<br />
              Site : <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">render.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. Paiement</h2>
            <p>
              Les paiements sont traités par <strong className="text-gray-900 dark:text-white">Paddle.com Market Ltd</strong>, 
              agissant en qualité de revendeur officiel (Merchant of Record).<br />
              Paddle.com Market Ltd, Judd House, 18-29 Mora Street, London, EC1V 8BT, UK.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Propriété intellectuelle</h2>
            <p>
              Le code, l'interface et les éléments graphiques sont la propriété exclusive
              de l'éditeur. Les contenus uploadés par les utilisateurs restent la propriété 
              de leurs auteurs respectifs.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Données personnelles</h2>
            <p>
              Voir notre <a href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Politique de Confidentialité</a>.<br />
              Contact RGPD : <a href="mailto:jacquesbene301@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">jacquesbene301@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Droit applicable</h2>
            <p>
              Le présent site est édité depuis le Cameroun. Les conditions de vente et 
              de paiement sont régies par les CGU de Paddle.com Market Ltd, notre 
              revendeur officiel.
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

export default MentionsLegales;
