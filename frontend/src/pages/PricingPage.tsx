// frontend/src/pages/PricingPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PaymentModal } from '../components/PaymentModal';

interface SelectedPlan {
  id: string;
  name: string;
  priceXAF: number; // Note: On garde le nom de la prop pour la compatibilité avec PaymentModal, mais la valeur est en EUR
  paddlePriceId: string;
  paddleLabel: string;
}

export default function PricingPage() {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
            {t('Pricing.title', 'Tarifs simples et transparents')}
          </h2>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">
            {t('Pricing.subtitle', 'Choisissez le plan qui correspond à vos besoins de recherche.')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-12">
          {/* FREE */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.free.name', 'Étudiant')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.free.desc', 'Pour découvrir la recherche qualitative.')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.free.price', '0')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.free.period', '€ / mois')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">✅ 1 projet actif</li>
              <li className="flex items-center">✅ 50 messages IA offerts</li>
              <li className="flex items-center">✅ 1h de transcription audio</li>
            </ul>
            <div className="mt-8">
              <button disabled className="w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-3 px-6 rounded-lg cursor-not-allowed">
                Plan actuel
              </button>
            </div>
          </div>

          {/* PRO */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-blue-600 p-8 flex flex-col relative transform scale-105">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg rounded-tr-lg">
              {t('Pricing.pro.recommended', 'Recommandé')}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.pro.name', 'Chercheur / Doctorant')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.pro.desc', 'Pour vos travaux de recherche personnels.')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.pro.price', '12')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.pro.period', '€ / mois')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center font-medium">⭐ Projets illimités</li>
              <li className="flex items-center font-medium">⭐ 10h de transcription / mois</li>
              <li className="flex items-center">✅ IA avancée (Ollama/DeepSeek)</li>
              <li className="flex items-center">✅ Export PDF & Word</li>
            </ul>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => setSelectedPlan({
                  id: 'pro_monthly',
                  name: `${t('Pricing.pro.name', 'Chercheur')} (Mensuel)`,
                  priceXAF: 12, // 12 €
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY,
                  paddleLabel: t('Pricing.pro.ctaMonthly', 'S\'abonner')
                })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.pro.ctaMonthly', 'S\'abonner')}
              </button>
              <button
                onClick={() => setSelectedPlan({
                  id: 'pro_yearly',
                  name: `${t('Pricing.pro.name', 'Chercheur')} (Annuel)`,
                  priceXAF: 120, // 120 €
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY,
                  paddleLabel: t('Pricing.pro.ctaYearly', 'Payer annuellement (-2 mois)')
                })}
                className="w-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.pro.ctaYearly', 'Payer annuellement (-2 mois)')}
              </button>
            </div>
          </div>

          {/* INSTITUTION (SaaS) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.institution.name', 'Institution / Labo')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.institution.desc', 'Pour les équipes de recherche.')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.institution.price', '99')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.institution.period', '€ / mois')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">✅ 10 utilisateurs inclus</li>
              <li className="flex items-center">✅ + 8 € / utilisateur suppl.</li>
              <li className="flex items-center">✅ Facturation centralisée</li>
              <li className="flex items-center">✅ Support prioritaire</li>
            </ul>
            <div className="mt-8 space-y-3">
              <a
                href="mailto:contact@ebenoresearch.com?subject=Demande%20de%20devis%20-%20Offre%20Institution%20SaaS&body=Bonjour,%0A%0ANous%20souhaitons%20obtenir%20un%20devis%20pour%20l'offre%20Institution%20SaaS.%0A%0ACordialement,"
                className="block w-full text-center bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Contacter les ventes
              </a>
              <p className="text-center text-xs text-gray-500 mt-2">
                Devis et bons de commande acceptés
              </p>
            </div>
          </div>
        </div>

        {/* DISCLAIMER DE FACTURATION */}
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-2">
            <strong className="text-gray-900 dark:text-white">Billing & Taxes :</strong> Prices are displayed in Euros (€). For international payments, the amount will be converted by your bank. All applicable taxes (VAT) are included or added based on your location.
          </p>
          <p className="mb-2">
            <strong className="text-gray-900 dark:text-white">Auto-renewal :</strong> Subscriptions automatically renew at the end of each billing period. You can cancel at any time from your dashboard.
          </p>
          <p>
            <strong className="text-gray-900 dark:text-white">Refunds :</strong> We offer a 14-day money-back guarantee for initial subscriptions. Please read our <a href="/refunds" className="text-blue-600 dark:text-blue-400 hover:underline">Refund Policy</a>.
          </p>
        </div>

        {/* SELF-HOSTED (Souveraineté) */}
        <div className="mt-8 bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl shadow-md p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔒</span>
              <h3 className="text-xl font-bold">Déploiement Self-Hosted (Souveraineté)</h3>
            </div>
            <p className="text-blue-100 text-sm md:text-base">
              Pour les Universités et Institutions exigeant une conformité RGPD stricte (aucune donnée ne quitte vos serveurs). Licence annuelle forfaitaire (à partir de 1 500 € / an), hébergée sur votre propre infrastructure Docker.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 w-full md:w-auto">
            <Link
              to="/docs/deployment"
              className="w-full md:w-auto bg-white text-blue-900 font-bold py-3 px-8 rounded-lg transition-colors hover:bg-blue-50 text-center shadow-sm whitespace-nowrap"
            >
              Voir le guide DSI
            </Link>
            <a
              href="mailto:contact@ebenoresearch.com?subject=Demande%20de%20devis%20-%20Offre%20Self-Hosted&body=Bonjour,%0A%0ANous%20souhaitons%20obtenir%20un%20devis%20pour%20le%20d%C3%A9ploiement%20Self-Hosted.%0A%0ACordialement,"
              className="text-xs text-blue-200 hover:text-white underline"
            >
              Demander un devis annuel
            </a>
          </div>
        </div>

        {/* PAYG */}
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl shadow-md border border-orange-200 dark:border-orange-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-bold text-orange-900 dark:text-orange-200">{t('Pricing.payg.title', 'Pay As You Go')}</h3>
            </div>
            <p className="text-orange-800 dark:text-orange-300 text-sm md:text-base">
              {t('Pricing.payg.desc', 'Besoin ponctuel ? Achetez des crédits IA à l\'unité pour transcrire un entretien ou analyser un document sans abonnement.')}
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 w-full md:w-auto">
            <span className="text-3xl font-extrabold text-orange-900 dark:text-orange-200">5 €</span>
            <button
              onClick={() => setSelectedPlan({
                id: 'payg',
                name: t('Pricing.payg.title', 'Pack de crédits'),
                priceXAF: 5, // 5 €
                paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PAYG,
                paddleLabel: t('Pricing.payg.cta', 'Acheter')
              })}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {t('Pricing.payg.cta', 'Acheter')}
            </button>
          </div>
        </div>

      </div>

      {/* Modale de paiement (uniquement pour Pro et PAYG) */}
      {selectedPlan && (
        <PaymentModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          price={selectedPlan.priceXAF}
          currency="EUR"
          paddlePriceId={selectedPlan.paddlePriceId}
          paddleLabel={selectedPlan.paddleLabel}
        />
      )}
    </div>
  );
}
