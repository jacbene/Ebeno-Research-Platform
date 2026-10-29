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
  org_id: number | null;      // ✅ AJOUTÉ
  org_name: string | null;    // ✅ AJOUTÉ
  org_messages_used: number | null;
  org_bonus_credits: number | null;
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
  const isOrg = !!u.org_id;
  const isPro = u.subscription_plan === 'pro' || u.subscription_plan === 'institution';
  
  // ✅ Si membre d'une org, on affiche le quota de l'org (10 000)
  const baseLimit = isOrg ? 10000 : (isPro ? 2000 : 50);
  const bonus = isOrg ? (u.org_bonus_credits || 0) : (u.bonus_credits || 0);
  const limit = baseLimit + bonus;
  
  const used = isOrg ? (u.org_messages_used || 0) : (u.messages_used || 0);
                  const percent = Math.min((used / limit) * 100, 100);
                  return (
                    <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name || t('AdminPanel.anonymous')}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
         <td className="px-6 py-4">
  <div className="flex flex-col gap-1">
    <span className={`px-2 py-1 rounded text-xs font-bold w-fit ${
      isPro ? 'bg-blue-900 text-blue-300' : 'bg-gray-700 text-gray-300'
    }`}>
      {isPro ? 'PRO' : 'FREE'}
    </span>
    {isOrgMember && u.org_name && (
      <span className="text-xs text-purple-300 bg-purple-900/30 px-2 py-1 rounded w-fit">
        🏢 {u.org_name}
      </span>
    )}
  </div>
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
