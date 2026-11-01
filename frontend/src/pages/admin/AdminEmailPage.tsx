// frontend/src/pages/admin/AdminEmailPage.tsx
import { useTranslation } from 'react-i18next';
import { AdminBroadcastEmail } from '../../components/AdminBroadcastEmail';

export default function AdminEmailPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">
        {t('AdminPanel.communication', { defaultValue: 'Communication' })}
      </h1>
      <p className="text-gray-400 mb-6">
        Envoyez des e-mails collectifs ou individuels à vos utilisateurs avec l'en-tête officiel de la plateforme.
      </p>
      
      {/* Le composant du formulaire qu'on a créé précédemment */}
      <AdminBroadcastEmail />
    </div>
  );
}
