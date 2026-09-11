// frontend/src/hooks/useProjectSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_BASE_URL = 'https://ebeno-backend.onrender.com';

export interface PresenceUser {
  userId: string;
  userName: string;
  userEmail?: string;
  color: string;
  joinedAt: string;
  lastSeen: string;
}

export interface ActivityItem {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  metadata?: any;
  createdAt: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  context: string;
  isTyping: boolean;
}

interface UseProjectSocketOptions {
  projectId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  onDataChange?: (event: string, data: any) => void;
}

export const useProjectSocket = ({
  projectId,
  userId,
  userName,
  userEmail,
  onDataChange,
}: UseProjectSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const onDataChangeRef = useRef(onDataChange);

  const [connected, setConnected] = useState(false);
  const [myColor, setMyColor] = useState<string>('#cccccc');
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // Garder la ref à jour
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Connexion initiale
  useEffect(() => {
    if (!projectId) return;

    console.log('🔌 [socket] Connexion à', API_BASE_URL);
    const socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    // ---------- Connexion ----------
    socket.on('connect', () => {
      console.log('✅ [socket] Connecté, id:', socket.id);
      setConnected(true);

      // Rejoindre le projet
      socket.emit('join-project', {
        projectId,
        userId,
        userName,
        userEmail,
      });
    });

    socket.on('disconnect', () => {
      console.log('❌ [socket] Déconnecté');
      setConnected(false);
    });

    // ---------- Ma couleur ----------
    socket.on('presence-color', (data: { color: string }) => {
      setMyColor(data.color);
    });

    // ---------- Liste des utilisateurs présents ----------
    socket.on('presence-update', (data: { users: PresenceUser[] }) => {
      console.log('👥 [socket] Présence mise à jour :', data.users.length, 'utilisateur(s)');
      setUsers(data.users || []);
    });

    // ---------- Activité créée ----------
    socket.on('activity-created', (data: { projectId: string; activity: ActivityItem }) => {
      if (data.projectId !== projectId) return;
      console.log('📋 [socket] Nouvelle activité :', data.activity.action);
      setActivities((prev) => [data.activity, ...prev].slice(0, 50));
    });

    // ---------- Indicateur de frappe ----------
    socket.on('user-typing', (data: TypingUser) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter((u) => !(u.userId === data.userId && u.context === data.context));
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    });

    // ---------- Événements de données (upload, trash, etc.) ----------
    const dataEvents = [
      'file-uploaded',
      'file-trashed',
      'file-restored',
      'file-deleted-permanently',
      'transcription-uploaded',
      'transcription-trashed',
      'transcription-restored',
      'transcription-deleted-permanently',
      'trash-emptied',
    ];

    dataEvents.forEach((eventName) => {
      socket.on(eventName, (data: any) => {
        if (data?.projectId && data.projectId !== projectId) return;
        console.log(`📡 [socket] ${eventName}`, data);
        if (onDataChangeRef.current) {
          onDataChangeRef.current(eventName, data);
        }
      });
    });

    // ---------- Ping automatique toutes les 30s ----------
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('presence-ping', { projectId });
      }
    }, 30000);

    // ---------- Nettoyage ----------
    return () => {
      console.log('🔌 [socket] Fermeture');
      clearInterval(pingInterval);
      socket.emit('leave-project', { projectId });
      socket.close();
    };
  }, [projectId, userId, userName, userEmail]);

  // ---------- API publique ----------
  const emitTyping = useCallback(
    (context: string, isTyping: boolean) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('typing', { projectId, context, isTyping });
      }
    },
    [projectId]
  );

  const emitCursorMove = useCallback(
    (documentId: string, position: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('cursor-move', { projectId, documentId, position });
      }
    },
    [projectId]
  );

  return {
    socket: socketRef.current,
    connected,
    myColor,
    users,
    activities,
    setActivities,
    typingUsers,
    emitTyping,
    emitCursorMove,
  };
};
