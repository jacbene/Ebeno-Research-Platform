import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

interface AdminGuardProps {
  children: ReactNode;
}

export const AdminGuard = ({ children }: AdminGuardProps) => {
  const navigate = useNavigate();
  
  console.log("🛡️ AdminGuard : Vérification en cours...");

  // On lit UNIQUEMENT le localStorage (qui contient le vrai rôle modifié en DB)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    console.error("Erreur lecture localStorage", e);
  }

  console.log("🛡️ AdminGuard : Utilisateur trouvé =", user);

  if (!user) {
    console.log("🛡️ AdminGuard : Pas d'utilisateur, redirection vers /login");
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role?.toUpperCase() === 'ADMIN'; 
  console.log("🛡️ AdminGuard : Est-ce un admin ?", isAdmin);

  if (!isAdmin) {
    console.log("🛡️ AdminGuard : Rôle non autorisé, redirection vers /");
    return <Navigate to="/" replace />;
  }

  // Si on a la 2FA activée (true), on laisse passer.
  // Si c'est undefined, on laisse passer aussi pour ne pas bloquer.
  const has2FA = user.twoFactorEnabled === true || user.twoFactorEnabled === undefined; 

  if (!has2FA) {
    console.log("🛡️ AdminGuard : 2FA manquante");
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

  console.log("🛡️ AdminGuard : Accès autorisé !");
  return <>{children}</>;
};
