// frontend/src/hooks/useProjectSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'https://ebeno-backend.onrender.com';

interface UseProjectSocketOptions {
  projectId: string;
  onEvent?: (event: string, data: any) => void;
}

export const useProjectSocket = ({ projectId, onEvent }: UseProjectSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);

  // Mettre à jour le ref à chaque changement
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!projectId) return;

    console.log('🔌 [socket] Connexion au serveur Socket.IO...');
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ [socket] Connecté, id:', socket.id);
      // Rejoindre la room du projet (si le backend le supporte)
      socket.emit('join-project', { projectId });
    });

    socket.on('disconnect', () => {
      console.log('❌ [socket] Déconnecté');
    });

    // ✅ Écouter TOUS les événements personnalisés
    const events = [
      'file-uploaded',
      'file-trashed',
      'file-restored',
      'file-deleted-permanently',
      'transcription-trashed',
      'transcription-restored',
      'transcription-deleted-permanently',
      'trash-emptied',
    ];

    events.forEach((eventName) => {
      socket.on(eventName, (data: any) => {
        // Filtrer par projectId si présent dans le payload
        if (data?.projectId && data.projectId !== projectId) return;

        console.log(`📡 [socket] Événement reçu : ${eventName}`, data);
        if (onEventRef.current) {
          onEventRef.current(eventName, data);
        }
      });
    });

    return () => {
      console.log('🔌 [socket] Fermeture de la connexion');
      socket.close();
    };
  }, [projectId]);

  return socketRef.current;
};
