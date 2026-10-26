import { PaddleCheckoutButton } from '../components/PaddleCheckoutButton';
import { useTranslation } from 'react-i18next';

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            {t('Pricing.title')}
          </h2>
          <p className="mt-4 text-xl text-gray-500">{t('Pricing.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 mb-12">
          {/* FREE */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900">{t('Pricing.free.name')}</h3>
            <p className="mt-2 text-gray-500">{t('Pricing.free.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">{t('Pricing.free.price')}</span>
              <span className="ml-1 text-xl text-gray-500">{t('Pricing.free.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600">
              <li className="flex items-center">✅ {t('Pricing.free.feature1')}</li>
              <li className="flex items-center">✅ {t('Pricing.free.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.free.feature3')}</li>
            </ul>
            <div className="mt-8">
              <button disabled className="w-full bg-gray-100 text-gray-500 font-bold py-3 px-6 rounded-lg cursor-not-allowed">
                {t('Pricing.free.cta')}
              </button>
            </div>
          </div>

          {/* PRO */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-600 p-8 flex flex-col relative transform scale-105">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg rounded-tr-lg">
              {t('Pricing.pro.recommended')}
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{t('Pricing.pro.name')}</h3>
            <p className="mt-2 text-gray-500">{t('Pricing.pro.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">{t('Pricing.pro.price')}</span>
              <span className="ml-1 text-xl text-gray-500">{t('Pricing.pro.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600">
              <li className="flex items-center font-medium">⭐ {t('Pricing.pro.feature1')}</li>
              <li className="flex items-center font-medium">⭐ {t('Pricing.pro.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.pro.feature3')}</li>
            </ul>
            <div className="mt-8 space-y-3">
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
                label={t('Pricing.pro.ctaMonthly')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              />
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY}
                label={t('Pricing.pro.ctaYearly')}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-6 rounded-lg transition-colors"
              />
            </div>
          </div>

          {/* INSTITUTION */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900">{t('Pricing.institution.name')}</h3>
            <p className="mt-2 text-gray-500">{t('Pricing.institution.desc')}</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">{t('Pricing.institution.price')}</span>
              <span className="ml-1 text-xl text-gray-500">{t('Pricing.institution.period')}</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1 text-gray-600">
              <li className="flex items-center">✅ {t('Pricing.institution.feature1')}</li>
              <li className="flex items-center">✅ {t('Pricing.institution.feature2')}</li>
              <li className="flex items-center">✅ {t('Pricing.institution.feature3')}</li>
            </ul>
            <div className="mt-8 space-y-3">
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_INST_MONTHLY}
                label={t('Pricing.institution.cta')}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              />
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_INST_YEARLY}
                label={t('Pricing.institution.ctaYearly')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 px-6 rounded-lg transition-colors"
              />
            </div>
          </div>
        </div>

        {/* PAYG */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-2xl shadow-md border border-orange-200 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">⚡</span>
              <h3 className="text-xl font-bold text-orange-900">{t('Pricing.payg.title')}</h3>
            </div>
            <p className="text-orange-800 text-sm md:text-base">{t('Pricing.payg.desc')}</p>
          </div>
          <div className="flex flex-col items-center gap-3 w-full md:w-auto">
            <span className="text-3xl font-extrabold text-orange-900">{t('Pricing.payg.price')}</span>
            <PaddleCheckoutButton
              priceId={import.meta.env.VITE_PADDLE_PRICE_PAYG}
              label={t('Pricing.payg.cta')}
              className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
