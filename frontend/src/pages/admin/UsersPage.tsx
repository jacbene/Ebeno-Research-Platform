import { useEffect, useState } from 'react';
import { api } from '../../services/api';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users')
      .then(res => setUsers(res.data.users))
      .catch(err => console.error("Erreur chargement users:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Gestion des Utilisateurs</h1>
      
      {loading ? (
        <p className="text-gray-400">Chargement des utilisateurs...</p>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase bg-gray-700 text-gray-400">
                <tr>
                  <th className="px-6 py-4">Nom / Email</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Abonnement</th>
                  <th className="px-6 py-4">Inscrit le</th>
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
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        u.role === 'ADMIN' ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.subscription_plan === 'pro' && u.subscription_status === 'active' ? (
                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-900 text-green-300">
                          PRO (Actif)
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Gratuit</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(u.createdAt).toLocaleDateString('fr-FR')}
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
