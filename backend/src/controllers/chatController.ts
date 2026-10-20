// backend/src/controllers/chatController.ts
/**
 * Controller pour le Chat IA multilingue
 */

import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  buildProjectContext,
  callAI,
  buildSystemPrompt,
  generateTitle,
  type ChatMessage,
} from '../services/chatService';
import { checkAndIncrementAiQuota } from '../services/aiQuotaService';

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getUserId = (req: Request): string | null => {
  return req.user?.id || null;
};

const publicConv = (c: any) => ({
  id: c.id,
  projectId: c.projectId,
  userId: c.userId,
  title: c.title,
  language: c.language,
  messageCount: c.messageCount,
  totalTokens: c.totalTokens,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

const publicMsg = (m: any) => ({
  id: m.id,
  role: m.role,
  content: m.content,
  model: m.model,
  tokens: m.tokens,
  sources: m.sources ? JSON.parse(m.sources) : [],
  createdAt: m.createdAt,
});

// ═══════════════════════════════════════════════════════════
// 1. GET /api/chat/conversations?projectId=xxx
// ═══════════════════════════════════════════════════════════

export const listConversations = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const projectId = req.query.projectId as string | undefined;

    const query = db('chat_conversations')
      .where({ userId })
      .whereNull('deletedAt')
      .orderBy('updatedAt', 'desc')
      .limit(50);

    if (projectId) query.where({ projectId });

    const conversations = await query;
    return res.json({ success: true, conversations: conversations.map(publicConv) });
  } catch (err) {
    logger.error(`[chat] listConversations : ${(err as Error).message}`);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ═══════════════════════════════════════════════════════════
// 2. POST /api/chat/conversations
// ═══════════════════════════════════════════════════════════

export const createConversation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { projectId, title, language } = req.body || {};
    if (!projectId) return res.status(400).json({ error: 'projectId requis' });

    const project = await db('projects').where({ id: projectId }).first();
    if (!project) return res.status(404).json({ error: 'Projet introuvable' });

    const now = new Date();
    const id = genId();

    await db('chat_conversations').insert({
      id,
      projectId,
      userId,
      title: title || 'Nouvelle conversation',
      language: language || 'fr',
      messageCount: 0,
      totalTokens: 0,
      createdAt: now,
      updatedAt: now,
    });

    const conv = await db('chat_conversations').where({ id }).first();
    return res.status(201).json({ success: true, conversation: publicConv(conv) });
  } catch (err) {
    logger.error(`[chat] createConversation : ${(err as Error).message}`);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ═══════════════════════════════════════════════════════════
// 3. GET /api/chat/conversations/:id
// ═══════════════════════════════════════════════════════════

export const getConversation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { id } = req.params;
    const conv = await db('chat_conversations')
      .where({ id, userId })
      .whereNull('deletedAt')
      .first();

    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });

    const messages = await db('chat_messages')
      .where({ conversationId: id })
      .orderBy('createdAt', 'asc');

    return res.json({
      success: true,
      conversation: publicConv(conv),
      messages: messages.map(publicMsg),
    });
  } catch (err) {
    logger.error(`[chat] getConversation : ${(err as Error).message}`);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ═══════════════════════════════════════════════════════════
// 4. DELETE /api/chat/conversations/:id
// ═══════════════════════════════════════════════════════════

export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { id } = req.params;
    const conv = await db('chat_conversations').where({ id, userId }).first();
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });

    await db('chat_conversations').where({ id }).update({ deletedAt: new Date() });
    return res.json({ success: true });
  } catch (err) {
    logger.error(`[chat] deleteConversation : ${(err as Error).message}`);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ═══════════════════════════════════════════════════════════
// 5. POST /api/chat/conversations/:id/messages
// ═══════════════════════════════════════════════════════════

export const postMessage = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    // ✅ VÉRIFICATION DU QUOTA IA
    const quotaCheck = await checkAndIncrementAiQuota(userId);
    if (!quotaCheck.allowed) {
      return res.status(403).json({ 
        error: "Quota dépassé", 
        message: quotaCheck.message,
        limit: quotaCheck.limit,
        used: quotaCheck.used
      });
    }

    const { id } = req.params;
    const { content } = req.body || {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Message vide' });
    }

    const conv = await db('chat_conversations')
      .where({ id, userId })
      .whereNull('deletedAt')
      .first();
    if (!conv) return res.status(404).json({ error: 'Conversation introuvable' });

    // 1. Enregistrer le message utilisateur
    const userMsgId = genId();
    const now = new Date();
    await db('chat_messages').insert({
      id: userMsgId,
      conversationId: id,
      role: 'user',
      content: content.trim(),
      createdAt: now,
    });

    // 2. Contexte projet
    const { contextText, sources } = await buildProjectContext(conv.projectId);

    // 3. Historique
    const history = await db('chat_messages')
      .where({ conversationId: id })
      .orderBy('createdAt', 'asc')
      .limit(30);

    const messages: ChatMessage[] = [
      { role: 'system', content: buildSystemPrompt(contextText, conv.language || 'fr') },
      ...history.map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // 4. Appel IA
    const startTime = Date.now();
    const aiRes = await callAI(messages);
    const duration = Date.now() - startTime;

    // 5. Enregistrer la réponse
    const assistantMsgId = genId();
    await db('chat_messages').insert({
      id: assistantMsgId,
      conversationId: id,
      role: 'assistant',
      content: aiRes.content,
      model: aiRes.model,
      tokens: aiRes.tokens || null,
      finishReason: aiRes.finishReason || null,
      sources: sources.length > 0 ? JSON.stringify(sources) : null,
      createdAt: new Date(),
    });

    // 6. Mettre à jour la conversation
    const newCount = (conv.messageCount || 0) + 2;
    const update: any = {
      messageCount: newCount,
      updatedAt: new Date(),
    };

    // Titre auto uniquement si l'IA a répondu (pas fallback)
    const aiWorked = aiRes.model !== 'fallback';
    if (
      aiWorked &&
      conv.messageCount === 0 &&
      (!conv.title || conv.title === 'Nouvelle conversation')
    ) {
      update.title = await generateTitle(content.trim());
    }

    if (aiRes.tokens) {
      update.totalTokens = (conv.totalTokens || 0) + aiRes.tokens;
    }

    await db('chat_conversations').where({ id }).update(update);

    // 7. Réponse
    const userMsg = await db('chat_messages').where({ id: userMsgId }).first();
    const assistantMsg = await db('chat_messages').where({ id: assistantMsgId }).first();

    return res.json({
      success: true,
      userMessage: publicMsg(userMsg),
      assistantMessage: publicMsg(assistantMsg),
      metadata: {
        model: aiRes.model,
        tokens: aiRes.tokens,
        durationMs: duration,
        sourcesCount: sources.length,
      },
    });
  } catch (err) {
    logger.error(`[chat] postMessage : ${(err as Error).message}`);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
