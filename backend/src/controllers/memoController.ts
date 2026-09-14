// backend/src/controllers/memoController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logActivity } from '../services/activityService';
import { emitGlobal } from '../socketManager';

// ============================================================
// LISTE DES MEMOS (filtrés par user + projet)
// ============================================================
export const getMemos = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { projectId } = req.query;

    let query = db('memos')
      .where({ userId })
      .whereNull('deletedAt');

    // ✅ Filtrer par projet si fourni
    if (projectId) {
      query = query.where({ projectId });
    }

    const memos = await query.orderBy('createdAt', 'desc');
    res.json(memos);
  } catch (error) {
    console.error('Erreur getMemos:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des memos' });
  }
};

// ============================================================
// RÉCUPÉRER UN MEMO (vérifier la propriété)
// ============================================================
export const getMemoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const memo = await db('memos').where({ id, userId }).first();
    if (!memo) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }
    res.json(memo);
  } catch (error) {
    console.error('Erreur getMemoById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du memo' });
  }
};

// ============================================================
// CRÉER UN MEMO (avec projectId)
// ============================================================
export const createMemo = async (req: Request, res: Response) => {
  try {
    const { title, content, projectId } = req.body;
    const user = (req as any).user;
    const userId = user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'Titre et contenu requis' });
    }

    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const now = new Date().toISOString();

    await db('memos').insert({
      id,
      title: title.trim(),
      content: content.trim(),
      userId,
      projectId: projectId || null,
      createdAt: now,
      updatedAt: now,
    });

    const memo = await db('memos').where({ id }).first();

    // 📡 Émettre l'événement Socket.IO
    if (projectId) {
      emitGlobal('memo-created', { projectId, memo });

      await logActivity({
        projectId,
        userId,
        userName: user?.name || user?.email,
        action: 'memo-created',
        targetType: 'memo',
        targetId: id,
        targetName: title.trim(),
      });
    }

    res.status(201).json({
      message: 'Memo créé avec succès',
      memo,
    });
  } catch (error) {
    console.error('Erreur createMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la création du memo' });
  }
};

// ============================================================
// METTRE À JOUR UN MEMO
// ============================================================
export const updateMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await db('memos').where({ id, userId }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }

    await db('memos')
      .where({ id, userId })
      .update({
        title: title?.trim() || existing.title,
        content: content?.trim() || existing.content,
        updatedAt: new Date().toISOString(),
      });

    const updated = await db('memos').where({ id }).first();
    res.json(updated);
  } catch (error) {
    console.error('Erreur updateMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

// ============================================================
// SUPPRIMER UN MEMO
// ============================================================
export const deleteMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const memo = await db('memos').where({ id, userId }).first();
    if (!memo) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }

    await db('memos').where({ id, userId }).delete();

    // 📡 Émettre l'événement
    if (memo.projectId) {
      emitGlobal('memo-deleted', { projectId: memo.projectId, id });
    }

    res.json({ message: 'Memo supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};
