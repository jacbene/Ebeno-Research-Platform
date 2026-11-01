// frontend/src/components/AdminBroadcastEmail.tsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export const AdminBroadcastEmail: React.FC = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'plan' | 'specific'>('all');
  const [targetValue, setTargetValue] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      toast.addToast({ type: 'error', title: 'Sujet et message requis.' });
      return;
    }
    if (targetType !== 'all' && !targetValue) {
      toast.addToast({ type: 'error', title: 'Veuillez préciser la cible.' });
      return;
    }

    if (!window.confirm(`Confirmer l'envoi à : ${targetType === 'all' ? 'Tous les utilisateurs' : targetValue} ?`)) return;

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
      toast.addToast({ type: 'error', title: err.response?.data?.error || 'Erreur lors de l\'envoi' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 max-w-3xl">
      <h2 className="text-xl font-bold text-white mb-4">📧 Envoyer un e-mail aux utilisateurs</h2>
      
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Destinataires</label>
          <select
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white outline-none focus:border-blue-500"
          >
            <option value="all">Tous les utilisateurs</option>
            <option value="plan">Par Plan (Free, Pro, Institution)</option>
            <option value="specific">Un utilisateur spécifique</option>
          </select>
        </div>

        {targetType === 'plan' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
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
            <label className="block text-sm font-medium text-gray-300 mb-1">Email de l'utilisateur</label>
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
          <label className="block text-sm font-medium text-gray-300 mb-1">Sujet</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="ex: Maintenance planifiée ce week-end"
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={8}
            placeholder="Écrivez votre message ici. Les retours à la ligne seront respectés."
            className="w-full p-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 outline-none focus:border-blue-500"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Envoi en cours...' : '🚀 Envoyer les e-mails'}
        </button>
      </form>
    </div>
  );
};
