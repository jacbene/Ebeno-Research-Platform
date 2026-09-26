// frontend/src/hooks/useRealtimeNotifications.ts
// ✅ Connexion Socket.IO globale pour recevoir les notifications de tous les projets

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';

const API_BASE_URL = 'https://ebeno-backend.onrender.com';

interface NotificationsOptions {
  /** ID du user connecté (pour filtrer ses propres actions) */
  currentUserId: string | null;
}

/**
 * Hook global à monter UNE SEULE FOIS (dans Layout.tsx).
 * Se connecte au serveur Socket.IO avec le JWT en handshake.
 * Le backend auto-join tous les projets du user.
 * Affiche un toast à chaque événement reçu.
 */
export const useRealtimeNotifications = ({ currentUserId }: NotificationsOptions) => {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const socketRef = useRef<Socket | null>(null);

  // ✅ Refs pour éviter de reconnecter à chaque render
  const addToastRef = useRef(addToast);
  const tRef = useRef(t);
  const userIdRef = useRef(currentUserId);

  useEffect(() => { addToastRef.current = addToast; }, [addToast]);
  useEffect(() => { tRef.current = t; }, [t]);
  useEffect(() => { userIdRef.current = currentUserId; }, [currentUserId]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Pas de token → pas de connexion (user non connecté)
      return;
    }

    // ✅ Connexion unique
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      auth: { token }, // ⭐ Le backend récupère le userId depuis le JWT
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔔 [notifications] Connecté au serveur');
    });

    socket.on('connect_error', (err: any) => {
      console.warn('⚠️ [notifications] Erreur connexion:', err.message);
    });

    // ────────────────────────────────────────────────────────
    // ✅ Helper : n'affiche pas les toasts de l'utilisateur lui-même
    // ────────────────────────────────────────────────────────
    const notify = (
      event: string,
      data: any,
      buildTitle: (tFn: any) => string,
      type: 'info' | 'success' | 'warning' | 'error' = 'info',
      message?: string
    ) => {
      // Ignore si c'est l'utilisateur lui-même qui a fait l'action
      const actorId = data?.actorId || data?.userId || data?.document?.createdBy;
      if (actorId && userIdRef.current && actorId === userIdRef.current) {
        return;
      }

      addToastRef.current({
        type,
        title: buildTitle(tRef.current),
        message,
        duration: 4000,
      });
    };

    // ────────────────────────────────────────────────────────
    // ✅ Écoute de tous les événements notifiables
    // ────────────────────────────────────────────────────────

    // 👥 Membre ajouté
    socket.on('member-added', (data: any) => {
      const name = data?.member?.name || data?.member?.email || 'Quelqu\'un';
      notify('member-added', data, (tFn) =>
        tFn('notifications.memberAdded', { name })
      );
    });

    // 👥 Membre retiré
    socket.on('member-removed', (data: any) => {
      notify('member-removed', data, (tFn) =>
        tFn('notifications.memberRemoved')
      );
    });

    // 📝 Document créé
socket.on('document-created', (data: any) => {
  const title =
    data?.document?.title ||
    data?.title ||
    data?.documentTitle ||
    'Sans titre';
  notify('document-created', data, (tFn) =>
    tFn('notifications.documentCreated', { title })
  );
});

    // ✏️ Document renommé
    socket.on('document-updated-title', (data: any) => {
      const title = data?.newTitle || 'Sans titre';
      notify('document-updated-title', data, (tFn) =>
        tFn('notifications.documentRenamed', { title })
      );
    });

    // 🗑️ Document supprimé
    socket.on('document-deleted', (data: any) => {
      notify('document-deleted', data, (tFn) =>
        tFn('notifications.documentDeleted')
      );
    });

    // 🎙️ Transcription uploadée
    socket.on('transcription-uploaded', (data: any) => {
      const title = data?.title || 'Audio';
      notify('transcription-uploaded', data, (tFn) =>
        tFn('notifications.transcriptionUploaded', { title })
      );
    });

    // 🎙️ Transcription relancée
    socket.on('transcription-retry', (data: any) => {
      notify('transcription-retry', data, (tFn) =>
        tFn('notifications.transcriptionRetry')
      );
    });

    // 🗑️ Transcription → corbeille
    socket.on('transcription-trashed', (data: any) => {
      const title = data?.title || 'Sans titre';
      notify('transcription-trashed', data, (tFn) =>
        tFn('notifications.transcriptionTrashed', { title })
      );
    });

    // ♻️ Transcription restaurée
    socket.on('transcription-restored', (data: any) => {
      const title = data?.title || 'Sans titre';
      notify('transcription-restored', data, (tFn) =>
        tFn('notifications.transcriptionRestored', { title })
      );
    });

    // 💥 Transcription supprimée définitivement
    socket.on('transcription-deleted-permanently', (data: any) => {
      const title = data?.title || 'Sans titre';
      notify('transcription-deleted-permanently', data, (tFn) =>
        tFn('notifications.transcriptionDeletedForever', { title })
      );
    });

    // 📝 Memo créé
socket.on('memo-created', (data: any) => {
  // ✅ Chercher le titre dans tous les emplacements possibles
  const title =
    data?.title ||
    data?.memoTitle ||
    data?.memo?.title ||
    'Sans titre';
  notify('memo-created', data, (tFn) =>
    tFn('notifications.memoCreated', { title })
  );
});

    // 🧹 Corbeille vidée
    socket.on('trash-emptied', (data: any) => {
      const count = data?.count || 0;
      notify('trash-emptied', data, (tFn) =>
        tFn('notifications.trashEmptied', { count })
      );
    });

// 💬 Commentaire ajouté
socket.on('comment-created', (data: any) => {
  notify('comment-created', data, (tFn) => {
    const name = data?.actorName || 'Quelqu\'un';
    return tFn('notifications.commentCreated', { name });
  });
});

    return () => {
      socket.off('member-added');
      socket.off('member-removed');
      socket.off('document-created');
      socket.off('document-updated-title');
      socket.off('document-deleted');
      socket.off('transcription-uploaded');
      socket.off('transcription-retry');
      socket.off('transcription-trashed');
      socket.off('transcription-restored');
      socket.off('transcription-deleted-permanently');
      socket.off('memo-created');
			socket.off('trash-emptied');
			socket.off('comment-created');
			socket.disconnect();
    };
  }, [currentUserId]); // Reconnecte si le user change (login/logout)

  return socketRef.current;
};

export default useRealtimeNotifications;
