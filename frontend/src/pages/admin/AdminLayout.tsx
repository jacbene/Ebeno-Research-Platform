import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export const AdminLayout = () => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const links = [
  { path: '/admin', label: '📊 Dashboard', exact: true },
  { path: '/admin/users', label: '👥 Utilisateurs' },
  { path: '/admin/subscriptions', label: '💳 Abonnements' },
  { path: '/admin/usage', label: '🤖 Usage IA' },
  { path: '/admin/moderation', label: '🛡️ Modération' }, // <-- AJOUTER CETTE LIGNE
];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Header Mobile */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h2 className="text-xl font-bold text-red-500">Ebeno Admin</h2>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-2xl">
          {isSidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-gray-800 border-r border-gray-700 flex-col`}>
        <div className="hidden md:block p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-red-500">Ebeno Admin</h2>
          <p className="text-xs text-gray-400 mt-1">Espace Réservé</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const isActive = link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`block px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <Link to="/" className="block text-center text-sm text-gray-400 hover:text-white">
            ← Retour à l'application
          </Link>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 p-4 md:p-8 bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
};
