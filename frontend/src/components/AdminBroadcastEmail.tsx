// frontend/src/components/AdminBroadcastEmail.tsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next'; // ✅ AJOUT

export const AdminBroadcastEmail: React.FC = () => {
  const toast = useToast();
  const { t } = useTranslation(); // ✅ AJOUT
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'plan' | 'specific'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.addToast({ type: 'error', title: t('common.error'), message: 'Sujet et message requis.' });
      return;
    }
    if (targetType !== 'all' && !targetValue) {
      toast.addToast({ type: 'error', title: t('common.error'), message: 'Veuillez préciser la cible.' });
      return;
    }

    if (!window.confirm(`${t('admin.email.confirmTitle')} ${targetType === 'all' ? t('admin.email.allUsers') : targetValue} ?`)) return;

    setLoading(true);
    try {
      const res = await api.post('/admin/emails/broadcast', {
        targetType,
        targetValue: targetType === 'all' ? undefined : targetValue,
        subject,
        message,
      });
      toast.addToast({ type: 'success', title: res.data.message });
      setSubject('');
      setMessage('');
    } catch (err: any) {
      toast.addToast({ type: 'error', title: err.response?.data?.error || t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 max-w-3xl">
      <h2 className="text-xl font-bold text-white mb-4">📧 {t('admin.email.title')}</h2>
      
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.email.recipients')}</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white outline-none focus:border-blue-500"
          >
            <option value="all">{t('admin.email.allUsers')}</option>
            <option value="plan">{t('admin.email.byPlan')}</option>
            <option value="specific">{t('admin.email.specificUser')}</option>
          </select>
        </div>

        {targetType === 'plan' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.usage.limit')}</label>
            <select
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white outline-none focus:border-blue-500"
            >
              <option value="">Sélectionnez un plan</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="institution">Institution</option>
            </select>
          </div>
        )}

        {targetType === 'specific' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.email.userEmail')}</label>
            <input
              type="email"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="utilisateur@email.com"
              className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 outline-none focus:border-blue-500"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.email.subject')}</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="ex: Maintenance planifiée ce week-end"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{t('admin.email.message')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Écrivez votre message ici..."
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 outline-none focus:border-blue-500"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? t('admin.email.sending') : t('admin.email.send')}
        </button>
      </form>
    </div>
  );
};
