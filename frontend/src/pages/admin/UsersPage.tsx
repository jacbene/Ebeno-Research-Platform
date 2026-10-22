import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  subscription_plan: string | null;
  subscription_status: string | null;
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(err => console.error("Erreur chargement users:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (id: string, newRole: string) => {
    if (!window.confirm(`Confirmer le changement de rôle en ${newRole} ?`)) return;
    
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur lors du changement de rôle");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">{t('AdminPanel.usersPage')}</h1>
      
      {loading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[700px]">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('AdminPanel.nameEmail')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.role')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.subscription')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.registeredOn')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{u.name || 'Sans nom'}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`px-3 py-1 rounded text-xs font-bold border outline-none cursor-pointer ${
                          u.role === 'ADMIN' 
                            ? 'bg-red-900/50 text-red-300 border-red-700' 
                            : 'bg-blue-900/50 text-blue-300 border-blue-700'
                        }`}
                      >
                        <option value="RESEARCHER" className="bg-gray-800 text-white">RESEARCHER</option>
                        <option value="ADMIN" className="bg-gray-800 text-white">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {u.subscription_plan === 'pro' && u.subscription_status === 'active' ? (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-900 text-green-300">
                          {t('AdminPanel.proActive')}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">{t('AdminPanel.free')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(u.createdAt).toLocaleDateString()}
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
