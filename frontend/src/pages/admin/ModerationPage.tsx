import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface AuditLog {
  id: number;
  action: string;
  status: string;
  ip: string;
  createdAt: string;
  user_email: string | null;
  user_name: string | null;
}

export default function ModerationPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/moderation')
      .then(res => setLogs(res.data.logs))
      .catch(err => console.error("Erreur chargement logs:", err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">{t('AdminPanel.moderationPage')}</h1>
      
      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : logs.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
          <p className="text-gray-400">{t('AdminPanel.noLogs')}</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[800px]">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('AdminPanel.dateTime')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.user')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.action')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.ip')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.status')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{log.user_name || t('AdminPanel.anonymous')}</div>
                      <div className="text-xs text-gray-400">{log.user_email || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-gray-900 px-2 py-1 rounded border border-gray-700 text-blue-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {log.ip || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        log.status === 'success' 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-red-900/50 text-red-400'
                      }`}>
                        {log.status}
                      </span>
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
