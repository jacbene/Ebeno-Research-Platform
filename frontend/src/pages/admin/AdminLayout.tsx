import { Outlet, Link, useLocation } from 'react-router-dom';

export const AdminLayout = () => {
  const location = useLocation();

  const links = [
    { path: '/admin', label: '📊 Dashboard', exact: true },
    { path: '/admin/users', label: '👥 Utilisateurs' },
    { path: '/admin/subscriptions', label: '💳 Abonnements' },
    { path: '/admin/usage', label: '🤖 Usage IA' },
    { path: '/admin/moderation', label: '🛡️ Modération' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-red-500">Ebeno Admin</h2>
          <p className="text-xs text-gray-400 mt-1">Espace Réservé</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const isActive = link.exact 
              ? location.pathname === link.path 
              : location.pathname.startsWith(link.path);
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`block px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                }`}
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
      <main className="flex-1 p-8 bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
};
