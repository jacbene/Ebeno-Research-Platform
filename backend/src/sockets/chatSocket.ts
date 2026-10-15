// backend/src/sockets/chatSocket.ts
/**
 * Namespace Socket.IO /chat pour le streaming IA
 * Événements :
 *   client → chat:stream   { conversationId, content }
 *   serveur → chat:user_saved  { id, content }
 *   serveur → chat:chunk   { content, model }
 *   serveur → chat:done    { messageId, fullContent, model, tokens, sources }
 *   serveur → chat:error   { error }
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { requireSecret } from '../config/secrets';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  buildProjectContext,
  buildSystemPrompt,
  generateTitle,
  type ChatMessage,
} from '../services/chatService';
import { streamAI } from '../services/streamService';

const JWT_SECRET = requireSecret('JWT_SECRET');

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

interface ChatAuthPayload {
  id: string;
  email: string;
  role: string;
}

export function setupChatSocket(io: SocketIOServer): void {
  const chatNs = io.of('/chat');

  // ─── Middleware d'authentification ───
  chatNs.use((socket: Socket, next: (err?: Error) => void) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization || '').replace('Bearer ', '');

      if (!token) return next(new Error('Token manquant'));

      const decoded = jwt.verify(token, JWT_SECRET) as ChatAuthPayload;
      (socket as any).user = decoded;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  });

  chatNs.on('connection', (socket: Socket) => {
    const user = (socket as any).user as ChatAuthPayload;
    logger.info(`💬 [chat-socket] Connexion : ${socket.id} (${user.email})`);

    // ═══════════════════════════════════════════════════════
    // Événement : chat:stream
    // ═══════════════════════════════════════════════════════
    socket.on(
      'chat:stream',
      async (payload: { conversationId: string; content: string }) => {
        const { conversationId, content } = payload || {};

        if (!conversationId || !content?.trim()) {
          socket.emit('chat:error', { error: 'conversationId et content requis' });
          return;
        }

        try {
          // 1. Vérifier la conversation
          const conv = await db('chat_conversations')
            .where({ id: conversationId, userId: user.id })
            .whereNull('deletedAt')
            .first();

          if (!conv) {
            socket.emit('chat:error', { error: 'Conversation introuvable' });
            return;
          }

          // 2. Enregistrer le message user
          const userMsgId = genId();
          await db('chat_messages').insert({
            id: userMsgId,
            conversationId,
            role: 'user',
            content: content.trim(),
            createdAt: new Date(),
          });

          socket.emit('chat:user_saved', { id: userMsgId, content: content.trim() });

          // 3. Contexte projet
          const { contextText, sources } = await buildProjectContext(conv.projectId);

          // 4. Historique
          const history = await db('chat_messages')
            .where({ conversationId })
            .orderBy('createdAt', 'asc')
            .limit(30);

          const messages: ChatMessage[] = [
            {
              role: 'system',
              content: buildSystemPrompt(contextText, conv.language || 'fr'),
            },
            ...history.map((m: any) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
          ];

          // 5. Streaming IA
          let fullContent = '';
          let model = 'unknown';
          let tokens: number | undefined;

          for await (const chunk of streamAI(messages)) {
            if (chunk.type === 'chunk' && chunk.content) {
              fullContent += chunk.content;
              socket.emit('chat:chunk', {
                content: chunk.content,
                model: chunk.model,
              });
              if (chunk.model) model = chunk.model;
            } else if (chunk.type === 'done') {
              if (chunk.model) model = chunk.model;
              if (chunk.tokens) tokens = chunk.tokens;
            }
          }

          // 6. Enregistrer la réponse assistant
          const assistantMsgId = genId();
          await db('chat_messages').insert({
            id: assistantMsgId,
            conversationId,
            role: 'assistant',
            content: fullContent,
            model,
            tokens: tokens || null,
            sources: sources.length > 0 ? JSON.stringify(sources) : null,
            createdAt: new Date(),
          });

          // 7. Mettre à jour la conversation
          const newCount = (conv.messageCount || 0) + 2;
          const update: any = { messageCount: newCount, updatedAt: new Date() };
          if (tokens) update.totalTokens = (conv.totalTokens || 0) + tokens;

          const aiWorked = model !== 'fallback';
          if (
            aiWorked &&
            conv.messageCount === 0 &&
            (!conv.title || conv.title === 'Nouvelle conversation')
          ) {
            update.title = await generateTitle(content.trim());
          }

          await db('chat_conversations').where({ id: conversationId }).update(update);

          // 8. Signaler la fin
          socket.emit('chat:done', {
            messageId: assistantMsgId,
            userMessageId: userMsgId,
            fullContent,
            model,
            tokens,
            sources,
            newTitle: update.title,
          });

          logger.info(
            `✅ [chat-socket] Stream terminé (${model}, ${tokens || '?'} tokens)`,
          );
        } catch (err) {
          logger.error(`[chat-socket] Erreur stream : ${(err as Error).message}`);
          socket.emit('chat:error', { error: 'Erreur lors du streaming' });
        }
      },
    );

    socket.on('disconnect', () => {
      logger.info(`💤 [chat-socket] Déconnexion : ${socket.id}`);
    });
  });

  logger.info('✅ [chat-socket] Namespace /chat initialisé');
}
