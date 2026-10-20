import { PaddleCheckoutButton } from '../components/PaddleCheckoutButton';
import { useTranslation } from 'react-i18next';

export default function PricingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Des tarifs adaptés à votre recherche
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            Choisissez le plan qui correspond à vos besoins. Passez à tout moment.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* PLAN FREE */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900">Free</h3>
            <p className="mt-2 text-gray-500">Pour découvrir la plateforme</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">0€</span>
              <span className="ml-1 text-xl text-gray-500">/mois</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-center text-gray-600">✅ 1 projet</li>
              <li className="flex items-center text-gray-600">✅ 50 messages IA / mois</li>
              <li className="flex items-center text-gray-600">✅ Fonctions de base</li>
            </ul>
            <div className="mt-8">
              <button disabled className="w-full bg-gray-100 text-gray-500 font-bold py-3 px-6 rounded-lg cursor-not-allowed">
                Plan actuel
              </button>
            </div>
          </div>

          {/* PLAN PRO */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-600 p-8 flex flex-col relative transform scale-105">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 text-xs font-bold rounded-bl-lg rounded-tr-lg">
              RECOMMANDÉ
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Pro</h3>
            <p className="mt-2 text-gray-500">Pour les chercheurs individuels</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">12€</span>
              <span className="ml-1 text-xl text-gray-500">/mois</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-center text-gray-600 font-medium">⭐ Projets illimités</li>
              <li className="flex items-center text-gray-600 font-medium">⭐ 2000 messages IA / mois</li>
              <li className="flex items-center text-gray-600">✅ Toutes les fonctions</li>
            </ul>
            <div className="mt-8 space-y-3">
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
                label="S'abonner au mensuel (12€)"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              />
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_YEARLY}
                label="Payer annuellement (120€)"
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 px-6 rounded-lg transition-colors"
              />
            </div>
          </div>

          {/* PLAN INSTITUTION */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 flex flex-col">
            <h3 className="text-2xl font-bold text-gray-900">Institution</h3>
            <p className="mt-2 text-gray-500">Pour les laboratoires et universités</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-extrabold text-gray-900">49€</span>
              <span className="ml-1 text-xl text-gray-500">/mois</span>
            </div>
            <ul className="mt-8 space-y-4 flex-1">
              <li className="flex items-center text-gray-600">✅ 5 sièges inclus</li>
              <li className="flex items-center text-gray-600">✅ 10 000 messages IA / mois</li>
              <li className="flex items-center text-gray-600">✅ Support prioritaire</li>
            </ul>
            <div className="mt-8">
              <PaddleCheckoutButton
                priceId={import.meta.env.VITE_PADDLE_PRICE_INST_MONTHLY}
                label="S'abonner (49€)"
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
