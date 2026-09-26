// frontend/src/hooks/usePushNotifications.ts
import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

// ============================================================
// Convertit la clé VAPID base64 en Uint8Array
// ============================================================
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UsePushNotificationsReturn {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  loading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<PushPermissionState>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // Vérifier le support au montage
  // ============================================================
  useEffect(() => {
    const check = async () => {
      const ok =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;

      setSupported(ok);
      if (!ok) {
        setPermission('unsupported');
        return;
      }

      setPermission(Notification.permission as PushPermissionState);

      // Vérifier si déjà subscribed
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          setSubscribed(!!sub);
        }
      } catch (err) {
        console.warn('[push] getSubscription failed:', err);
      }
    };
    check();
  }, []);

  // ============================================================
  // Enregistrer le Service Worker
  // ============================================================
  const ensureServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    if (!('serviceWorker' in navigator)) return null;
    try {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }
      return reg;
    } catch (err: any) {
      console.warn('[push] SW register failed:', err);
      return null;
    }
  };

  // ============================================================
  // ✅ SUBSCRIBE
  // ============================================================
  const subscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // 1. Demander la permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermissionState);

      if (perm !== 'granted') {
        setError('Permission refusée');
        return false;
      }

      // 2. Enregistrer le SW
      const reg = await ensureServiceWorker();
      if (!reg) {
        setError('Service Worker indisponible');
        return false;
      }

      // 3. Récupérer la clé VAPID publique
      const vapidRes = await api.get('/push/vapid-public-key');
      const publicKey = vapidRes.data?.publicKey;

      if (!publicKey) {
        setError('Push non configuré côté serveur');
        return false;
      }

      // 4. Subscribe
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 5. Envoyer au backend
      await api.post('/push/subscribe', {
        subscription: subscription.toJSON(),
      });

      setSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('[push] subscribe error:', err);
      setError(err.message || 'Erreur lors de la souscription');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // ✅ UNSUBSCRIBE
  // ============================================================
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        setSubscribed(false);
        return true;
      }

      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setSubscribed(false);
        return true;
      }

      const endpoint = sub.endpoint;

      // 1. Prévenir le backend
      await api.post('/push/unsubscribe', { endpoint });

      // 2. Unsubscribe côté navigateur
      await sub.unsubscribe();

      setSubscribed(false);
      return true;
    } catch (err: any) {
      console.error('[push] unsubscribe error:', err);
      setError(err.message || 'Erreur lors de la désinscription');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================
  // Refresh (utile après login/logout)
  // ============================================================
  const refresh = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      }
      if ('Notification' in window) {
        setPermission(Notification.permission as PushPermissionState);
      }
    } catch (err) {
      // silently ignore
    }
  }, []);

  return {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    refresh,
  };
};

export default usePushNotifications;
