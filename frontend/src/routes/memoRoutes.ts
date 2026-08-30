// src/routes/memoRoutes.ts
import { Router } from 'express';
import { db } from '../db/knex';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/memos?projectId=xxx
// Récupère tous les memos de l'utilisateur, éventuellement filtrés par projet
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    const { projectId } = req.query;

    let query = db('memos').where({ userId });
    if (projectId) {
      query = query.where({ projectId });
    }

    const memos = await query.orderBy('created_at', 'desc');
    res.json(memos);
  } catch (error) {
    console.error('Erreur GET /memos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/memos/:id
// Récupère un memo spécifique (vérification userId)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const memo = await db('memos')
      .where({ id, userId })
      .first();

    if (!memo) {
      return res.status(404).json({ error: 'Memo non trouvé' });
    }

    res.json(memo);
  } catch (error) {
    console.error('Erreur GET /memos/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/memos
// Crée un nouveau memo avec userId et projectId (optionnel)
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { title, content, projectId } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Le titre et le contenu sont requis' });
    }

    const id = Date.now().toString();
    await db('memos').insert({
      id,
      title: title.trim(),
      content: content.trim(),
      userId,
      projectId: projectId || null,
      created_at: Date.now(),
      updated_at: Date.now()
    });

    const newMemo = await db('memos').where({ id }).first();
    res.status(201).json(newMemo);
  } catch (error) {
    console.error('Erreur POST /memos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/memos/:id
// Met à jour un memo existant (vérification userId)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const { title, content } = req.body;

    const existing = await db('memos')
      .where({ id, userId })
      .first();

    if (!existing) {
      return res.status(404).json({ error: 'Memo non trouvé ou non autorisé' });
    }

    await db('memos')
      .where({ id })
      .update({
        title: title !== undefined ? title.trim() : existing.title,
        content: content !== undefined ? content.trim() : existing.content,
        updated_at: Date.now()
      });

    const updated = await db('memos').where({ id }).first();
    res.json(updated);
  } catch (error) {
    console.error('Erreur PUT /memos/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/memos/:id
// Supprime un memo (vérification userId)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    const deleted = await db('memos')
      .where({ id, userId })
      .delete();

    if (deleted === 0) {
      return res.status(404).json({ error: 'Memo non trouvé ou non autorisé' });
    }

    res.json({ message: 'Memo supprimé' });
  } catch (error) {
    console.error('Erreur DELETE /memos/:id:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
