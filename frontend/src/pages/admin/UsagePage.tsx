// frontend/src/pages/admin/UsagePage.tsx
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface PersonalUsage { id: string; email: string; name: string; role: string; personal_messages_used: number; subscription_plan: string | null; }
interface OrgUsage { org_id: string; org_name: string; org_messages_used: number; member_count: string; }

export default function UsagePage() {
  const { t } = useTranslation();
  const [personalUsage, setPersonalUsage] = useState<PersonalUsage[]>([]);
  const [organizationUsage, setOrganizationUsage] = useState<OrgUsage[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/usage')
      .then(res => {
        setPersonalUsage(res.data.personalUsage || []);
        setOrganizationUsage(res.data.organizationUsage || []);
        setMonth(res.data.month);
      })
      .catch(err => console.error("Erreur usage:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">{t('common.loading')}</p>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">
          {t('AdminPanel.usagePage')} - {month}
        </h1>
      </div>

      {organizationUsage.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-blue-400 mb-4">🏢 {t('admin.usage.orgs')}</h2>
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300 min-w-full">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('admin.usage.orgName')}</th>
                  <th className="px-6 py-4 text-center">{t('admin.usage.members')}</th>
                  <th className="px-6 py-4 text-center">{t('admin.usage.messagesUsed')}</th>
                  <th className="px-6 py-4 text-center">{t('admin.usage.limit')}</th>
                </tr>
              </thead>
              <tbody>
                {organizationUsage.map((org) => (
                  <tr key={org.org_id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-4 font-medium text-white">{org.org_name}</td>
                    <td className="px-6 py-4 text-center text-gray-400">{org.member_count}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <span className="font-bold text-white">{org.org_messages_used || 0}</span>
                        <div className="w-24 bg-gray-600 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(((org.org_messages_used || 0) / 10000) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-gray-400">10 000</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-green-400 mb-4">👤 {t('admin.usage.individuals')}</h2>
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-300 min-w-full">
            <thead className="text-xs uppercase bg-gray-700 text-gray-400">
              <tr>
                <th className="px-6 py-4">{t('AdminPanel.user')}</th>
                <th className="px-6 py-4">{t('AdminPanel.plan')}</th>
                <th className="px-6 py-4 text-center">{t('admin.usage.messagesUsed')}</th>
                <th className="px-6 py-4 text-center">{t('admin.usage.limit')}</th>
              </tr>
            </thead>
            <tbody>
              {personalUsage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">{t('admin.usage.noIndividual')}</td>
                </tr>
              ) : (
                personalUsage.map((u) => {
                  const limit = u.subscription_plan === 'pro' ? 2000 : 50;
                  return (
                    <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{u.name || t('AdminPanel.anonymous')}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          u.subscription_plan === 'pro' ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-300'
                        }`}>
                          {u.subscription_plan === 'pro' ? 'PRO' : 'FREE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <span className="font-bold text-white">{u.personal_messages_used || 0}</span>
                          <div className="w-24 bg-gray-600 rounded-full h-2">
                            <div className={`h-2 rounded-full ${u.subscription_plan === 'pro' ? 'bg-green-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min(((u.personal_messages_used || 0) / limit) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-gray-400">{limit}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
