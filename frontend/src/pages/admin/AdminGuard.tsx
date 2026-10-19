import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface AdminGuardProps {
  children: ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Si pas d'utilisateur, on redirige vers login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Vérification du rôle Admin
  const isAdmin = user.role === 'ADMIN' || user.role === 'admin'; // Adapte selon tes rôles en DB
  
  // Vérification 2FA (si ton objet user contient twoFactorEnabled)
  const has2FA = user.twoFactorEnabled === true; 

  if (!isAdmin) {
    return <Navigate to="/" replace />; // Accès refusé
  }

  if (!has2FA) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Accès Restreint</h1>
        <p className="text-gray-700 mb-6">Vous devez activer la double authentification (2FA) pour accéder au panel administrateur.</p>
        <button 
          onClick={() => navigate('/settings')}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Aller aux paramètres
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
