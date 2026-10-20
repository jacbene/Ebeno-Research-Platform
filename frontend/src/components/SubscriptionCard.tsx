import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PaddleCheckoutButton } from './PaddleCheckoutButton';
import { useTranslation } from 'react-i18next';

interface SubscriptionData {
  plan: string;
  status: string;
  current_period_end: string;
}

export const SubscriptionCard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<{ subscription: SubscriptionData | null; usage: { messages_used: number } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/status')
      .then(res => setData(res.data))
      .catch(err => console.error("Erreur statut abonnement:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-gray-500">Chargement de l'abonnement...</div>;
  if (!data) return null;

  const { subscription, usage } = data;
  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'institution';
  const messagesUsed = usage?.messages_used || 0;
  
  // Calcul de la limite (2000 pour Pro, 10000 pour Institution)
  const limit = subscription?.plan === 'institution' ? 10000 : isPro ? 2000 : 50;
  const isQuotaExceeded = messagesUsed >= limit;

  // Vérifier si l'abonnement expire bientôt (dans moins de 7 jours)
  const isExpiringSoon = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  // --- RENDU CONDITIONNEL ---

  // 1. Utilisateur non abonné (Free)
  if (!isPro) {
    return (
      <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Passez à la version Pro 🚀</h2>
        <p className="text-gray-600 mb-4">Débloquez les projets illimités et 2000 messages IA par mois.</p>
        <div className="flex gap-4">
          <PaddleCheckoutButton
            priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
            label="S'abonner pour 12€/mois"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          />
        </div>
      </div>
    );
  }

  // 2. Abonné Pro : Quota dépassé ou proche de l'être (PAYG)
  if (isPro && (isQuotaExceeded || messagesUsed > limit * 0.9)) {
    return (
      <div className="my-8 p-6 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-orange-800 mb-2">Attention, quota IA bientôt atteint ⚠️</h2>
        <p className="text-orange-700 mb-4">
          Vous avez utilisé <strong>{messagesUsed} / {limit}</strong> messages ce mois-ci.
        </p>
        <div className="flex gap-4">
          <PaddleCheckoutButton
            priceId={import.meta.env.VITE_PADDLE_PRICE_PAYG}
            label="Recharger 1000 messages (5€)"
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          />
        </div>
      </div>
    );
  }

  // 3. Abonné Pro : Expire bientôt ou renouvellement
  if (isPro && (isExpiringSoon || subscription.status === 'past_due')) {
    return (
      <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-red-800 mb-2">Votre abonnement arrive à échéance ⏳</h2>
        <p className="text-red-700 mb-4">
          Votre plan {subscription.plan.toUpperCase()} se termine le {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}.
        </p>
        <div className="flex gap-4">
          <PaddleCheckoutButton
            priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
            label="Renouveler maintenant"
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          />
        </div>
      </div>
    );
  }

  // 4. Abonné Pro : Tout va bien (Affichage d'info)
  return (
    <div className="my-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-green-800 mb-2">Abonnement {subscription.plan.toUpperCase()} Actif ✅</h2>
      <p className="text-green-700">
        Votre abonnement est actif. Vous avez utilisé <strong>{messagesUsed} / {limit}</strong> messages IA ce mois-ci.
        Prochaine facturation le {new Date(subscription.current_period_end).toLocaleDateString('fr-FR')}.
      </p>
    </div>
  );
};
