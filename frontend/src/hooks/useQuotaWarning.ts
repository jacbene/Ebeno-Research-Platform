// frontend/src/hooks/useQuotaWarning.ts
import { useCallback } from 'react';
import { useToast } from '../context/ToastContext';

/**
 * Hook réutilisable pour afficher les alertes de quota IA.
 * Paliers : 50% (info), 75% (warning), 95% (error), 100% (error).
 * Ne s'affiche qu'une seule fois par utilisateur par mois par palier (localStorage).
 */
export const useQuotaWarning = () => {
  const toast = useToast();

  return useCallback((quota?: { used: number; limit: number }) => {
    if (!quota || !quota.limit) return;

    const percent = (quota.used / quota.limit) * 100;

    let threshold: number | null = null;
    if (percent >= 100) threshold = 100;
    else if (percent >= 95) threshold = 95;
    else if (percent >= 75) threshold = 75;
    else if (percent >= 50) threshold = 50;

    if (threshold === null) return;

    let userId = 'anon';
    try {
      userId = JSON.parse(localStorage.getItem('user') || '{}')?.id || 'anon';
    } catch { /* ignore */ }
    const month = new Date().toISOString().slice(0, 7);
    const storageKey = `quota_warning_${userId}_${month}_${threshold}`;

    if (localStorage.getItem(storageKey)) return;
    localStorage.setItem(storageKey, '1');

    if (threshold === 100) {
      toast.addToast({
        type: 'error',
        title: 'Quota IA épuisé 🚫',
        message: `Vous avez utilisé vos ${quota.limit} messages. Rendez-vous sur /pricing pour recharger.`,
        duration: 6000,
      });
    } else if (threshold === 95) {
      toast.addToast({
        type: 'error',
        title: 'Quota presque épuisé 🚨',
        message: `Il ne vous reste que ${quota.limit - quota.used} message(s) sur ${quota.limit}. Rechargez bientôt.`,
        duration: 6000,
      });
    } else if (threshold === 75) {
      toast.addToast({
        type: 'warning',
        title: 'Attention, quota à 75% ⚠️',
        message: `Vous avez consommé ${Math.round(percent)}% de votre crédit IA (${quota.used}/${quota.limit}).`,
        duration: 6000,
      });
    } else if (threshold === 50) {
      toast.addToast({
        type: 'info',
        title: 'Information : 50% du quota utilisé 💡',
        message: `Vous avez consommé la moitié de votre crédit IA (${quota.used}/${quota.limit}).`,
        duration: 6000,
      });
    }
  }, [toast]);
};
