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
  isSuspended?: boolean;
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
      alert(err.response?.data?.error || "Erreur");
    }
  };

  const handleSuspend = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "réactiver" : "suspendre";
    if (!window.confirm(`Voulez-vous vraiment ${action} cet utilisateur ?`)) return;
    try {
      await api.patch(`/admin/users/${id}/suspend`, { suspended: !currentStatus });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isSuspended: !currentStatus } : u));
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur");
    }
  };

  const handleAddCredits = async (id: string) => {
    const amountStr = window.prompt("Combien de crédits IA ajouter ? (ex: 1000)", "1000");
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount)) return alert("Montant invalide");

    try {
      await api.post(`/admin/users/${id}/credits`, { amount });
      alert(`✅ ${amount} crédits ajoutés avec succès !`);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erreur");
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
            <table className="w-full text-left text-sm text-gray-300 min-w-[900px]">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">{t('AdminPanel.nameEmail')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.role')}</th>
                  <th className="px-6 py-4">{t('AdminPanel.subscription')}</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`border-b border-gray-700 hover:bg-gray-750 ${u.isSuspended ? 'opacity-50' : ''}`}>
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
                      <span className={`px-2 py-1 rounded text-xs font-bold ${u.isSuspended ? 'bg-red-900 text-red-300' : 'bg-green-900/30 text-green-400'}`}>
                        {u.isSuspended ? 'Suspendu' : 'Actif'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAddCredits(u.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          title="Ajouter des crédits IA"
                        >
                          + Crédits
                        </button>
                        <button 
                          onClick={() => handleSuspend(u.id, !!u.isSuspended)}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            u.isSuspended 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                        >
                          {u.isSuspended ? 'Réactiver' : 'Suspendre'}
                        </button>
                      </div>
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
