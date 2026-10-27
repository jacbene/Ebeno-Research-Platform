import React from 'react';
import LegalLanguageNotice from '../components/LegalLanguageNotice';

const PrivacyPage: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow border border-transparent dark:border-gray-700">
        <LegalLanguageNotice />

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Politique de Confidentialité</h1>

        <div className="space-y-6 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Responsable du traitement</h2>
            <p>
              <strong className="text-gray-900 dark:text-white">Ebeno Research Platform</strong><br />
              Jacques Bene Mbama<br />
              Localisation : Cameroun<br />
              Contact : <a href="mailto:jacquesbene301@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">jacquesbene301@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Données collectées</h2>
            <p>Nous collectons uniquement les données nécessaires au fonctionnement de la plateforme :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Données d'identification (email, nom, avatar)</li>
              <li>Données de vos projets de recherche (documents, transcriptions, memos)</li>
              <li>Données de facturation (gérées par Paddle, jamais stockées chez nous)</li>
              <li>Logs techniques (adresse IP, actions d'audit) pour la sécurité</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. Finalité du traitement</h2>
            <p>
              Vos données sont utilisées pour fournir le service Ebeno, améliorer la 
              plateforme, assurer la sécurité et respecter nos obligations légales. 
              Nous ne vendons jamais vos données à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Vos droits (RGPD)</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong className="text-gray-900 dark:text-white">Droit d'accès</strong> : consulter vos données</li>
              <li><strong className="text-gray-900 dark:text-white">Droit de rectification</strong> : corriger vos données</li>
              <li><strong className="text-gray-900 dark:text-white">Droit à l'effacement</strong> : supprimer votre compte (délai de 30 jours)</li>
              <li><strong className="text-gray-900 dark:text-white">Droit à la portabilité</strong> : exporter vos données (JSON)</li>
            </ul>
            <p className="mt-2">
              Pour exercer ces droits, contactez-nous à : 
              <a href="mailto:jacquesbene301@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline"> jacquesbene301@gmail.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Autorité de contrôle</h2>
            <p>
              Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir 
              l'autorité de protection des données compétente. L'éditeur étant basé au Cameroun, 
              vous pouvez également vous référer aux principes du RGPD européen qui s'appliquent 
              à nos utilisateurs européens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Cookies</h2>
            <p>
              Voir notre <a href="/cookies" className="text-blue-600 dark:text-blue-400 hover:underline">Politique de Cookies</a>.
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

export default PrivacyPage;
