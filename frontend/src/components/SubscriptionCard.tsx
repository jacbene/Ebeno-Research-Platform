import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { PaddleCheckoutButton } from './PaddleCheckoutButton';
import { useTranslation } from 'react-i18next';

export const SubscriptionCard = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<{ subscription: any; usage: any } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/me/status')
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-gray-500">...</div>;
  if (!data) return null;

  const { subscription, usage } = data;
  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'institution';
  const messagesUsed = usage?.messages_used || 0;
  const limit = (subscription?.plan === 'institution' ? 10000 : isPro ? 2000 : 50) + (usage?.bonus_credits || 0);
  const isQuotaExceeded = messagesUsed >= limit;
  const isExpiringSoon = subscription?.current_period_end 
    ? new Date(subscription.current_period_end).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  if (!isPro) {
    return (
      <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 mb-2">{t('Pricing.subscription.upgradeTitle')}</h2>
        <p className="text-gray-600 mb-4">{t('Pricing.subscription.upgradeDesc')}</p>
        <PaddleCheckoutButton
          priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
          label={t('Pricing.subscription.upgradeCta')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
        />
      </div>
    );
  }

  if (isQuotaExceeded || messagesUsed > limit * 0.9) {
    return (
      <div className="my-8 p-6 bg-orange-50 border border-orange-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-orange-800 mb-2">{t('Pricing.subscription.quotaTitle')}</h2>
        <p className="text-orange-700 mb-4">
          {t('Pricing.subscription.quotaDesc', { used: messagesUsed, limit })}
        </p>
        <PaddleCheckoutButton
          priceId={import.meta.env.VITE_PADDLE_PRICE_PAYG}
          label={t('Pricing.subscription.quotaCta')}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-lg"
        />
      </div>
    );
  }

  if (isExpiringSoon || subscription.status === 'past_due') {
    return (
      <div className="my-8 p-6 bg-red-50 border border-red-200 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold text-red-800 mb-2">{t('Pricing.subscription.expireTitle')}</h2>
        <p className="text-red-700 mb-4">
          {t('Pricing.subscription.expireDesc', { 
            plan: subscription.plan.toUpperCase(), 
            date: new Date(subscription.current_period_end).toLocaleDateString() 
          })}
        </p>
        <PaddleCheckoutButton
          priceId={import.meta.env.VITE_PADDLE_PRICE_PRO_MONTHLY}
          label={t('Pricing.subscription.expireCta')}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg"
        />
      </div>
    );
  }

  return (
    <div className="my-8 p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-bold text-green-800 mb-2">{t('Pricing.subscription.activeTitle')}</h2>
      <p className="text-green-700">
        {t('Pricing.subscription.activeDesc', { 
          used: messagesUsed, 
          limit, 
          date: new Date(subscription.current_period_end).toLocaleDateString() 
        })}
      </p>
    </div>
  );
};
