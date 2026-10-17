// frontend/src/hooks/useChatStream.ts
/**
 * Hook Socket.IO pour le streaming du chat IA
 *
 * Usage :
 *   const { connected, sendMessage, onChunk, onDone } = useChatStream();
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

interface UseChatStreamOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onDone?: (data: StreamDone) => void;
  onUserSaved?: (data: StreamUserSaved) => void;
  onError?: (error: string) => void;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);

  // Refs des callbacks (pour éviter les re-connexions)
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

    socket.on('chat:error', (err: { error: string }) => {
      setStreaming(false);
      callbacksRef.current.onError?.(err.error);
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
