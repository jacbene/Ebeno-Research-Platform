import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface UsageData {
  id: string;
  email: string;
  name: string;
  role: string;
  messages_used: number | null;
  bonus_credits: number | null;
  subscription_plan: string | null;
}

export default function AiUsagePage() {
  const { t } = useTranslation();
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [currentMonth, setCurrentMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/usage')
      .then(res => {
        setUsage(res.data.usage);
        setCurrentMonth(res.data.month);
      })
      .catch(err => console.error("Erreur chargement usage:", err))
      .finally(() => setLoading(false));
  }, []);

  const getProgressColor = (used: number, limit: number) => {
    const percent = (used / limit) * 100;
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">{t('AdminPanel.usagePage')} - {currentMonth}</h1>
      </div>
      
      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[700px]">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('AdminPanel.user')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.plan')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.messagesUsed')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.limit')}</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => {
                  const isPro = u.subscription_plan === 'pro';
                  const baseLimit = isPro ? 2000 : 50;
                  const bonus = u.bonus_credits || 0;
                  const limit = baseLimit + bonus;
                  
                  const used = u.messages_used || 0;
                  const percent = Math.min((used / limit) * 100, 100);
                  return (
                    <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name || t('AdminPanel.anonymous')}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isPro ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {isPro ? 'PRO' : 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-white w-12 text-right">{used}</span>
                          <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden min-w-[100px]">
                            <div 
                              className={`h-full ${getProgressColor(used, limit)}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {limit} msg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
