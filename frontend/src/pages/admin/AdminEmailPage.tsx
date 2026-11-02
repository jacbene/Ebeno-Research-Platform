// frontend/src/pages/admin/AdminEmailPage.tsx
import { useTranslation } from 'react-i18next';
import { AdminBroadcastEmail } from '../../components/AdminBroadcastEmail';

export default function AdminEmailPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">
        {t('admin.email.pageTitle')}
      </h1>
      <p className="text-gray-400 mb-6">
        {t('admin.email.pageDesc')}
      </p>
      
      <AdminBroadcastEmail />
    </div>
  );
}
