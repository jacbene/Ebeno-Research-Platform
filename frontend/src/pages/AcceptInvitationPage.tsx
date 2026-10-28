import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  
  // Récupérer l'utilisateur connecté depuis le localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  useEffect(() => {
    if (!token) {
      setError("Lien d'invitation invalide (token manquant).");
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await api.get(`/organizations/invitations/${token}`);
        setInvitation(res.data.invitation);
      } catch (err: any) {
        setError(err.response?.data?.error || "Invitation invalide ou expirée.");
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleAccept = async () => {
    if (!currentUser) {
      // Si pas connecté, on redirige vers login en gardant le token
      navigate(`/login?redirect=/join-org?token=${token}`);
      return;
    }

    setAccepting(true);
    try {
      await api.post(`/organizations/invitations/${token}/accept`);
      alert("🎉 Félicitations ! Vous avez rejoint l'organisation.");
      navigate('/settings'); // Redirection vers les paramètres pour voir l'organisation
    } catch (err: any) {
      setError(err.response?.data?.error || "Erreur lors de l'acceptation.");
      setAccepting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">{t('common.loading')}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg text-center">
        
        {error ? (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-red-600 mb-2">Erreur</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <button onClick={() => navigate('/')} className="bg-gray-200 text-gray-800 py-2 px-6 rounded-lg font-bold">
              Retour à l'accueil
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">🏢</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Invitation reçue
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Vous avez été invité à rejoindre l'organisation <strong>{invitation?.organization_name}</strong>.
            </p>

            {!currentUser ? (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg mb-6 text-sm text-blue-800 dark:text-blue-200">
                Vous devez être connecté avec l'adresse <strong>{invitation?.email}</strong> pour accepter.
              </div>
            ) : (
              currentUser.email.toLowerCase() !== invitation?.email.toLowerCase() && (
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg mb-6 text-sm text-red-800 dark:text-red-200">
                  ⚠️ Vous êtes connecté en tant que <strong>{currentUser.email}</strong>, mais l'invitation a été envoyée à <strong>{invitation?.email}</strong>.
                </div>
              )
            )}

            <button
              onClick={handleAccept}
              disabled={accepting || (currentUser && currentUser.email.toLowerCase() !== invitation?.email.toLowerCase())}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {accepting ? 'Acceptation...' : (currentUser ? "Accepter l'invitation" : "Se connecter pour accepter")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
