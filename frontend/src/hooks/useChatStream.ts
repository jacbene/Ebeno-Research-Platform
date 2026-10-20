// frontend/src/hooks/useChatStream.ts
/**
 * Hook Socket.IO pour le streaming du chat IA
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL =
  import.meta.env.VITE_API_URL || 'https://ebeno-backend.onrender.com';

export interface StreamChunk {
  content: string;
  model: string;
}

export interface StreamDone {
  messageId: string;
  userMessageId: string;
  fullContent: string;
  model: string;
  tokens?: number;
  sources: Array<{ type: string; id: string; name: string }>;
  newTitle?: string;
}

export interface StreamUserSaved {
  id: string;
  content: string;
}

export interface StreamError {
  error: string;
  code?: string;
  limit?: number;
  used?: number;
}

interface UseChatStreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onDone?: (data: StreamDone) => void;
  onUserSaved?: (data: StreamUserSaved) => void;
  onError?: (error: string) => void;
  // ✅ NOUVEAU : Callback dédié pour le dépassement de quota
  onQuotaExceeded?: (data: { message: string; limit: number; used: number }) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Refs des callbacks
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  // ─── Connexion ───
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    const socket = io(`${API_URL}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[chat-socket] ✅ Connecté');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[chat-socket] ❌ Déconnecté :', reason);
      setConnected(false);
      setStreaming(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[chat-socket] Erreur connexion :', err.message);
      setConnected(false);
    });

    // ─── Événements métier ───
    socket.on('chat:user_saved', (data: StreamUserSaved) => {
      callbacksRef.current.onUserSaved?.(data);
    });

    socket.on('chat:chunk', (chunk: StreamChunk) => {
      callbacksRef.current.onChunk?.(chunk);
    });

    socket.on('chat:done', (data: StreamDone) => {
      setStreaming(false);
      callbacksRef.current.onDone?.(data);
    });

    // ✅ MODIFICATION : Interception des erreurs
    socket.on('chat:error', (err: StreamError) => {
      setStreaming(false);
      
      // Si l'erreur est due à un dépassement de quota
      if (err.code === 'QUOTA_EXCEEDED' && callbacksRef.current.onQuotaExceeded) {
        callbacksRef.current.onQuotaExceeded({
          message: err.error,
          limit: err.limit || 0,
          used: err.used || 0
        });
      } else {
        // Pour les autres erreurs (réseau, conversation introuvable, etc.)
        callbacksRef.current.onError?.(err.error || 'Erreur inconnue');
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ─── Envoyer un message ───
  const sendMessage = useCallback(
    (conversationId: string, content: string) => {
      if (!socketRef.current?.connected) {
        options.onError?.('Socket non connecté');
        return false;
      }
      setStreaming(true);
      socketRef.current.emit('chat:stream', { conversationId, content });
      return true;
    },
    [options],
  );

  return {
    connected,
    streaming,
    sendMessage,
  };
}
