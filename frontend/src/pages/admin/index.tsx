import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface Stats {
  users: number;
  proUsers: number;
  aiRequests: number;
  paygPurchases: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error("Erreur stats:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">{t('AdminPanel.dashboard')}</h1>
      
      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm font-semibold uppercase">{t('AdminPanel.totalUsers')}</h3>
            <p className="text-4xl font-bold text-white mt-2">{stats?.users || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm font-semibold uppercase">{t('AdminPanel.proSubscribers')}</h3>
            <p className="text-4xl font-bold text-green-400 mt-2">{stats?.proUsers || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm font-semibold uppercase">{t('AdminPanel.aiRequests')}</h3>
            <p className="text-4xl font-bold text-blue-400 mt-2">{stats?.aiRequests || 0}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-gray-400 text-sm font-semibold uppercase">{t('AdminPanel.paygRecharges')}</h3>
            <p className="text-4xl font-bold text-orange-400 mt-2">{stats?.paygPurchases || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
}
