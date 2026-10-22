import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface Subscription {
  id: number;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  plan: string;
  status: string;
  current_period_end: string;
  created_at: string;
  user_email: string;
  user_name: string;
}

export default function SubscriptionsPage() {
  const { t } = useTranslation();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/subscriptions')
      .then(res => setSubscriptions(res.data.subscriptions))
      .catch(err => console.error("Erreur chargement abonnements:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">{t('AdminPanel.subsPage')}</h1>
      
      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : subscriptions.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400">{t('AdminPanel.noSubs')}</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('AdminPanel.client')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.plan')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.status')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.periodEnd')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.paddleId')}</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{sub.user_name || t('AdminPanel.anonymous')}</div>
                      <div className="text-xs text-gray-400">{sub.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-blue-900 text-blue-300 uppercase">
                        {sub.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        sub.status === 'active' 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {formatDate(sub.current_period_end)}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {sub.paddle_subscription_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
