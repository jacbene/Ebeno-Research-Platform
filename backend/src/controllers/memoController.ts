import { Request, Response } from 'express';
import { db } from '../db/knex';

export const getMemos = async (req: Request, res: Response) => {
  try {
    const memos = await db('memos').select('*');
    res.json(memos);
  } catch (error) {
    console.error('Erreur getMemos:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des memos' });
  }
};

export const getMemoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const memo = await db('memos').where({ id }).first();
    if (!memo) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }
    res.json(memo);
  } catch (error) {
    console.error('Erreur getMemoById:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du memo' });
  }
};

export const createMemo = async (req: Request, res: Response) => {
  try {
    const { title, content } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const id = Date.now().toString();
    await db('memos').insert({
      id,
      title,
      content,
      userId,
      created_at: Date.now(),
      updated_at: Date.now()
    });

    res.status(201).json({ 
      message: 'Memo créé avec succès',
      memo: { id, title, content, userId }
    });
  } catch (error) {
    console.error('Erreur createMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la création du memo' });
  }
};

export const updateMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const existing = await db('memos').where({ id }).first();
    if (!existing) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }

    await db('memos')
      .where({ id })
      .update({
        title: title || existing.title,
        content: content || existing.content,
        updated_at: Date.now()
      });

    const updated = await db('memos').where({ id }).first();
    res.json(updated);
  } catch (error) {
    console.error('Erreur updateMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

export const deleteMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await db('memos').where({ id }).delete();

    if (!deleted) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }

    res.json({ message: 'Memo supprimé avec succès' });
  } catch (error) {
    console.error('Erreur deleteMemo:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  }
};
