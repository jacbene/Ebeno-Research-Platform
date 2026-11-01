// frontend/src/pages/PricingPage.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PaymentModal } from '../components/PaymentModal';

// Type pour stocker les infos du plan sélectionné
interface SelectedPlan {
  id: string;
  name: string;
  priceXAF: number;
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
            {t('Pricing.title')}
          </h2>
          <p className="mt-4 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-12">
          {/* FREE */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.free.name')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.free.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.free.price')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.free.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">✅ {t('Pricing.free.feature1')}</li>
              <li className="flex items-center">✅ {t('Pricing.free.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.free.feature3')}</li>
            </ul>
            <div className="mt-8">
              <button disabled className="w-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-bold py-3 px-6 rounded-lg cursor-not-allowed">
                {t('Pricing.free.cta')}
              </button>
            </div>
          </div>

          {/* PRO */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-blue-600 p-8 flex flex-col relative transform scale-105">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg rounded-tr-lg">
              {t('Pricing.pro.recommended')}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.pro.name')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.pro.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.pro.price')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.pro.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center font-medium">⭐ {t('Pricing.pro.feature1')}</li>
              <li className="flex items-center font-medium">⭐ {t('Pricing.pro.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.pro.feature3')}</li>
            </ul>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => setSelectedPlan({
                  id: 'pro_monthly',
                  name: `${t('Pricing.pro.name')} (Mensuel)`,
                  priceXAF: 8000,
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY,
                  paddleLabel: t('Pricing.pro.ctaMonthly')
                })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.pro.ctaMonthly')}
              </button>
              <button
                onClick={() => setSelectedPlan({
                  id: 'pro_yearly',
                  name: `${t('Pricing.pro.name')} (Annuel)`,
                  priceXAF: 80000,
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY,
                  paddleLabel: t('Pricing.pro.ctaYearly')
                })}
                className="w-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.pro.ctaYearly')}
              </button>
            </div>
          </div>

          {/* INSTITUTION */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{t('Pricing.institution.name')}</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('Pricing.institution.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('Pricing.institution.price')}</span>
              <span className="ml-1 text-xl text-gray-500 dark:text-gray-400">{t('Pricing.institution.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600 dark:text-gray-300">
              <li className="flex items-center">✅ {t('Pricing.institution.feature1')}</li>
              <li className="flex items-center">✅ {t('Pricing.institution.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.institution.feature3')}</li>
            </ul>
            <div className="mt-8 space-y-3">
              <button
                onClick={() => setSelectedPlan({
                  id: 'institution_monthly',
                  name: `${t('Pricing.institution.name')} (Mensuel)`,
                  priceXAF: 32000,
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_INST_MONTHLY,
                  paddleLabel: t('Pricing.institution.cta')
                })}
                className="w-full bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.institution.cta')}
              </button>
              <button
                onClick={() => setSelectedPlan({
                  id: 'institution_yearly',
                  name: `${t('Pricing.institution.name')} (Annuel)`,
                  priceXAF: 320000,
                  paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_INST_YEARLY,
                  paddleLabel: t('Pricing.institution.ctaYearly')
                })}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {t('Pricing.institution.ctaYearly')}
              </button>
            </div>
          </div>
        </div>

        {/* PAYG */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl shadow-md border border-orange-200 dark:border-orange-800 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-bold text-orange-900 dark:text-orange-200">{t('Pricing.payg.title')}</h3>
            </div>
            <p className="text-orange-800 dark:text-orange-300 text-sm md:text-base">{t('Pricing.payg.desc')}</p>
          </div>
          <div className="flex flex-col items-center gap-3 w-full md:w-auto">
            <span className="text-3xl font-extrabold text-orange-900 dark:text-orange-200">{t('Pricing.payg.price')}</span>
            <button
              onClick={() => setSelectedPlan({
                id: 'payg',
                name: t('Pricing.payg.title'),
                priceXAF: 3300,
                paddlePriceId: import.meta.env.VITE_PADDLE_PRICE_PAYG,
                paddleLabel: t('Pricing.payg.cta')
              })}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {t('Pricing.payg.cta')}
            </button>
          </div>
        </div>

      </div>

      {/* ✅ Ajout de la modale de paiement */}
      {selectedPlan && (
        <PaymentModal
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          priceXAF={selectedPlan.priceXAF}
          paddlePriceId={selectedPlan.paddlePriceId}
          paddleLabel={selectedPlan.paddleLabel}
        />
      )}
    </div>
  );
}
