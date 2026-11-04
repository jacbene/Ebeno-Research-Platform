// frontend/src/components/SubscriptionCard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

// ✅ NOUVEAU : Interface pour les props
interface SubscriptionCardProps {
  aiQuota?: {
    plan: string;
    personalUsed: number;
    personalLimit: number;
    organization: {
      id: string;
      name: string;
      used: number;
      limit: number;
    } | null;
  } | null;
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ aiQuota }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<{ subscription: any; usage: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    api.get('/users/me/status')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.post('/users/me/billing-portal');
      if (res.data.success && res.data.url) {
        window.location.href = res.data.url;
      } else {
        alert("Impossible d'ouvrir le portail de facturation.");
      }
    } catch (err: any) {
      console.error("Erreur portail:", err);
      const message = err.response?.data?.error || "Une erreur est survenue.";
      alert(message);
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">...</div>;
  if (!data) return null;

  const { subscription } = data;
  
  // ✅ 1. AFFICHAGE POUR LES MEMBRES D'ORGANISATION
  if (aiQuota?.organization) {
    const percent = Math.min((aiQuota.organization.used / aiQuota.organization.limit) * 100, 100);
    return (
      <div className="my-8 p-6 bg-blue-50 border border-blue-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
          🏢 Organisation : {aiQuota.organization.name}
        </h2>
        <p className="text-blue-800 dark:text-blue-200 mb-4">
          Quota IA partagé : <strong>{aiQuota.organization.used} / {aiQuota.organization.limit}</strong> messages utilisés ce mois-ci.
        </p>
        <div className="w-full bg-blue-200 rounded-full h-2 mb-4 dark:bg-gray-600">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percent}%` }}></div>
        </div>
     <button 
  disabled 
  style={{ opacity: 0.6, cursor: 'not-allowed', padding: '8px 16px', borderRadius: '6px', border: '1px solid #ddd', backgroundColor: '#f5f5f5', color: '#666' }}
>
  💳 Portail de facturation bientôt disponible
</button>
      </div>
    );
  }

  // ✅ Récupération des infos depuis le backend pour les utilisateurs individuels
  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'institution';
  const messagesUsed = aiQuota?.personalUsed !== undefined ? aiQuota.personalUsed : (data.usage?.messages_used || 0);
  const limit = aiQuota?.personalLimit !== undefined ? aiQuota.personalLimit : ((subscription?.plan === 'institution' ? 10000 : isPro ? 2000 : 50) + (data.usage?.bonus_credits || 0));
  
  const isQuotaExceeded = messagesUsed >= limit;
  const isExpiringSoon = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  // ✅ 2. UTILISATEUR FREE (ou sans abonnement actif)
  if (!isPro && aiQuota?.plan !== 'pro') {
    return (
      <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm dark:from-gray-800 dark:to-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
          {t('Pricing.subscription.upgradeTitle')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('Pricing.subscription.upgradeDesc')}
        </p>
        <Link
          to="/pricing"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          {t('Pricing.subscription.upgradeCta')} →
        </Link>
      </div>
    );
  }

  // ✅ 3. QUOTA DÉPASSÉ (Pro ou bonus)
  if (isQuotaExceeded || messagesUsed > limit * 0.9) {
    return (
      <div className="my-8 p-6 bg-orange-50 border border-orange-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-bold text-orange-800 dark:text-orange-300 mb-2">
          {t('Pricing.subscription.quotaTitle')}
        </h2>
        <p className="text-orange-700 dark:text-orange-200 mb-4">
          {t('Pricing.subscription.quotaDesc', { used: messagesUsed, limit })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {t('Pricing.subscription.quotaCta')} →
          </Link>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            className="inline-block bg-white hover:bg-gray-50 text-orange-700 font-bold py-2 px-6 rounded-lg border border-orange-300 transition-colors disabled:opacity-50"
          >
            {portalLoading ? 'Chargement...' : '💳 Gérer mon abonnement'}
          </button>
        </div>
      </div>
    );
  }

  // ✅ 4. ABONNÉ PRO : Expire bientôt
  if (isExpiringSoon || subscription?.status === 'past_due') {
    return (
      <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">
          {t('Pricing.subscription.expireTitle')}
        </h2>
        <p className="text-red-700 dark:text-red-200 mb-4">
          {t('Pricing.subscription.expireDesc', { 
            plan: subscription.plan.toUpperCase(), 
            date: new Date(subscription.current_period_end).toLocaleDateString() 
          })}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            {t('Pricing.subscription.expireCta')} →
          </Link>
          <button
            onClick={openBillingPortal}
            disabled={portalLoading}
            className="inline-block bg-white hover:bg-gray-50 text-red-700 font-bold py-2 px-6 rounded-lg border border-red-300 transition-colors disabled:opacity-50"
          >
            {portalLoading ? 'Chargement...' : '💳 Gérer mon abonnement'}
          </button>
        </div>
      </div>
    );
  }

  // ✅ 5. ABONNÉ PRO : Tout va bien
  return (
    <div className="my-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <h2 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
        {t('Pricing.subscription.activeTitle')}
      </h2>
      <p className="text-green-700 dark:text-green-200 mb-4">
        {t('Pricing.subscription.activeDesc', { 
          used: messagesUsed, 
          limit, 
          date: subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'N/A'
        })}
      </p>
      <button
        onClick={openBillingPortal}
        disabled={portalLoading}
        className="inline-block bg-white hover:bg-gray-50 text-green-700 font-bold py-2 px-6 rounded-lg border border-green-300 transition-colors disabled:opacity-50"
      >
        {portalLoading ? 'Chargement...' : '💳 Gérer mon abonnement'}
      </button>
    </div>
  );
};
