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

export interface TypingUser {
  userId: string;
  userName: string;
  context: string;
  isTyping: boolean;
}

export interface CollaborativeDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt?: string | number;
}

export interface DocumentUser {
  userId: string;
  userName: string;
  color: string;
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

  // États présence projet
  const [connected, setConnected] = useState(false);
  const [myColor, setMyColor] = useState<string>('#cccccc');
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  // ✅ États document collaboratif
  const [currentDocument, setCurrentDocument] = useState<CollaborativeDocument | null>(null);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [documentUsers, setDocumentUsers] = useState<DocumentUser[]>([]);
  const [documentTyping, setDocumentTyping] = useState<TypingUser[]>([]);

  // Garder la ref à jour
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // ============================================================
  // Connexion initiale
  // ============================================================
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
      console.log('👥 [socket] Présence mise à jour :', data.users?.length, 'utilisateur(s)');
      setUsers(data.users || []);
    });

    // ---------- Activité créée ----------
    socket.on('activity-created', (data: { projectId: string; activity: ActivityItem }) => {
      if (data.projectId !== projectId) return;
      console.log('📋 [socket] Nouvelle activité :', data.activity.action);
      setActivities((prev) => [data.activity, ...prev].slice(0, 50));
    });

    // ---------- Indicateur de frappe (projet) ----------
    socket.on('user-typing', (data: TypingUser) => {
      setTypingUsers((prev) => {
        const filtered = prev.filter(
          (u) => !(u.userId === data.userId && u.context === data.context)
        );
        return data.isTyping ? [...filtered, data] : filtered;
      });

      // ✅ Aussi pour les documents (contexte préfixé par "doc-")
      if (data.context.startsWith('doc-')) {
        setDocumentTyping((prev) => {
          const filtered = prev.filter(
            (u) => !(u.userId === data.userId && u.context === data.context)
          );
          return data.isTyping ? [...filtered, data] : filtered;
        });
      }
    });

    // ============================================================
    // ✅ Document collaboratif
    // ============================================================

    // ---------- Contenu initial du document ----------
    socket.on('document-content', (data: { document: CollaborativeDocument; users: DocumentUser[] }) => {
      console.log('📄 [socket] Document reçu :', data.document?.id);
      setCurrentDocument(data.document);
      setDocumentContent(data.document?.content || '');
      setDocumentUsers(data.users || []);
    });

    // ---------- Document : mise à jour par un autre utilisateur ----------
    socket.on(
      'document-updated',
      (data: { content: string; userId: string; userName: string; version: number }) => {
        // On ignore notre propre écho (le serveur ne nous le renvoie pas normalement)
        if (data.userId === userId) return;
        console.log('✏️ [socket] Document mis à jour par', data.userName);
        setDocumentContent(data.content);
        setCurrentDocument((prev) =>
          prev ? { ...prev, content: data.content, version: data.version } : prev
        );
      }
    );

    // ---------- Document : utilisateur rejoint ----------
    socket.on('user-joined', (user: DocumentUser) => {
      console.log('➕ [socket] Éditeur rejoint :', user.userName);
      setDocumentUsers((prev) => {
        if (prev.some((u) => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
    });

    // ---------- Document : utilisateur parti ----------
    socket.on('user-left', (data: { userId: string }) => {
      console.log('➖ [socket] Éditeur parti :', data.userId);
      setDocumentUsers((prev) => prev.filter((u) => u.userId !== data.userId));

      // Retirer aussi de la frappe
      setDocumentTyping((prev) => prev.filter((u) => u.userId !== data.userId));
    });

    // ---------- Document : curseur déplacé ----------
    socket.on(
      'cursor-moved',
      (data: {
        userId: string;
        userName: string;
        position: number;
        documentId: string;
        socketId: string;
      }) => {
        if (data.userId === userId) return;
        // Événement exposé pour les futurs curseurs visuels
        // On peut stocker les positions si besoin
      }
    );

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
  // ✅ AJOUT : événements manquants
  'memo-created',
  'document-created',
  'document-updated-title',
  'document-deleted',
  'member-added',
  'member-removed',
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
      socketRef.current = null;
    };
  }, [projectId, userId, userName, userEmail]);

  // ============================================================
  // API publique
  // ============================================================

  /**
   * Signale qu'on est en train de taper dans un contexte donné
   */
  const emitTyping = useCallback(
    (context: string, isTyping: boolean) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('typing', { projectId, context, isTyping });
      }
    },
    [projectId]
  );

  /**
   * Envoie la position du curseur
   */
  const emitCursorMove = useCallback(
    (documentId: string, position: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('cursor-move', { projectId, documentId, position });
      }
    },
    [projectId]
  );

  /**
   * ✅ Rejoindre un document collaboratif
   */
  const joinDocument = useCallback(
    (documentId: string) => {
      if (socketRef.current?.connected) {
        console.log('📄 [socket] Rejoindre le document', documentId);
        socketRef.current.emit('join-document', {
          documentId,
          userId,
          userName,
          color: myColor,
        });
      }
    },
    [userId, userName, myColor]
  );

  /**
   * ✅ Quitter un document collaboratif
   */
  const leaveDocument = useCallback((documentId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-document', { documentId });
      // Nettoyer l'état local
      setDocumentUsers([]);
      setDocumentTyping([]);
      setCurrentDocument(null);
      setDocumentContent('');
    }
  }, []);

  /**
   * ✅ Envoyer les modifications d'un document
   */
  const editDocument = useCallback(
    (documentId: string, content: string, cursorPosition?: number) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit('edit-document', {
          documentId,
          content,
          cursorPosition,
        });
      }
    },
    []
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
    // ✅ API document collaboratif
    currentDocument,
    documentContent,
    setDocumentContent,
    documentUsers,
    documentTyping,
    joinDocument,
    leaveDocument,
    editDocument,
  };
};
