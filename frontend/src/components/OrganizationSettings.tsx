import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useTranslation } from 'react-i18next';
import { PaddleCheckoutButton } from './PaddleCheckoutButton';

interface Member {
  id: number;
  user_id: string;
  role: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  joined_at: string;
}

interface Invitation {
  id: number;
  email: string;
  created_at: string;
  expires_at: string;
}

interface OrgData {
  organization: {
    id: number;
    name: string;
    plan: string;
    max_seats: number;
    seats_used: number;
    seats_pending: number;
    seats_available: number;
  };
  members: Member[];
  invitations: Invitation[];
}

export const OrganizationSettings = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchOrgData = async () => {
    try {
      const res = await api.get('/organizations/me');
      setData(res.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 403) {
        // L'utilisateur n'est pas propriétaire d'une organisation
        setData(null);
      } else {
        setError(t('organization.loadError', 'Impossible de charger les données de l\'organisation.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgData();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError(t('organization.invalidEmail', 'Adresse email invalide.'));
      return;
    }

    setInviting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post('/organizations/invite', { email: inviteEmail });
      setSuccessMsg(t('organization.inviteSuccess', 'Invitation envoyée avec succès !'));
      setInviteEmail('');
      // Rafraîchir les données pour voir l'invitation en attente
      await fetchOrgData();
    } catch (err: any) {
      setError(err.response?.data?.error || t('organization.inviteError', 'Erreur lors de l\'envoi de l\'invitation.'));
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500">{t('common.loading')}</div>;
  if (!data) return null; // Ne rien afficher si l'utilisateur n'a pas d'organisation

  const { organization, members, invitations } = data;
  const isFull = organization.seats_available <= 0;

  return (
    <div className="space-y-6">
      {/* En-tête de l'organisation */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🏢 {organization.name}
        </h2>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-300">
          <span className="bg-blue-100 dark:bg-blue-800 px-3 py-1 rounded-full font-bold">
            {t('organization.plan', 'Plan')} : {organization.plan.toUpperCase()}
          </span>
          <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full font-bold">
            {t('organization.seatsUsed', 'Sièges utilisés')} : {organization.seats_used + organization.seats_pending} / {organization.max_seats}
          </span>
        </div>
      </div>

      {/* Bouton d'achat de sièges */}
<div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
    🪑 Ajouter des sièges
  </h3>
  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
    Vous avez besoin de plus de {organization.max_seats} sièges ? Ajoutez-en à votre abonnement.
  </p>
  <div className="flex flex-col sm:flex-row gap-3">
    <PaddleCheckoutButton
      priceId={import.meta.env.VITE_PADDLE_PRICE_EXTRA_SEAT_MONTHLY}
      label="+ 1 siège (10€/mois)"
      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
    />
    <PaddleCheckoutButton
      priceId={import.meta.env.VITE_PADDLE_PRICE_EXTRA_SEAT_YEARLY}
      label="+ 1 siège (100€/an)"
      className="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2 px-6 rounded-lg transition-colors"
    />
  </div>
</div>

      {/* Messages d'erreur / succès */}
      {error && <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}
      {successMsg && <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{successMsg}</div>}

      {/* Formulaire d'invitation */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {t('organization.inviteTitle', 'Inviter un nouveau membre')}
        </h3>
        {isFull ? (
          <p className="text-orange-600 dark:text-orange-400 text-sm font-medium">
            ⚠️ {t('organization.seatsFull', 'Tous les sièges sont occupés. Ajoutez des sièges supplémentaires pour inviter plus de membres.')}
          </p>
        ) : (
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={t('organization.emailPlaceholder', 'Email du chercheur...')}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {inviting ? t('common.loading') : t('organization.inviteButton', 'Inviter')}
            </button>
          </form>
        )}
      </div>

      {/* Liste des membres */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          {t('organization.membersTitle', 'Membres de l\'équipe')} ({members.length})
        </h3>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                {member.user_avatar ? (
                  <img src={member.user_avatar} alt={member.user_name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  (member.user_name || member.user_email).substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">{member.user_name || 'Sans nom'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{member.user_email}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-bold ${member.role === 'owner' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}>
                {member.role === 'owner' ? '👑 Owner' : 'Member'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {t('organization.pendingTitle', 'Invitations en attente')} ({invitations.length})
          </h3>
          <div className="space-y-2">
            {invitations.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">{invite.email}</span>
                <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400">
                  ⏳ {t('organization.pending', 'En attente')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
