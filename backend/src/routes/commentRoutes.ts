import { Router } from 'express';
import { addComment, getComments, deleteComment } from '../services/commentService';
import { authenticate } from '../middleware/auth';
import { db } from '../db/knex';

const router = Router();

// Ajouter un commentaire
router.post('/:transcriptionId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { transcriptionId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }

    // Vérifier que la transcription existe et appartient à l'utilisateur
    const transcription = await db('transcriptions')
      .where({ id: transcriptionId, userId })
      .first();
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription non trouvée ou accès refusé' });
    }

    const commentId = await addComment(transcriptionId, userId, content.trim());
    const newComment = await db('comments')
      .join('users', 'comments.user_id', 'users.id')
      .where('comments.id', commentId)
      .select('comments.*', 'users.name as userName', 'users.email as userEmail')
      .first();

    res.status(201).json(newComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Récupérer les commentaires d'une transcription
router.get('/:transcriptionId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { transcriptionId } = req.params;

    const transcription = await db('transcriptions')
      .where({ id: transcriptionId, userId })
      .first();
    if (!transcription) {
      return res.status(404).json({ error: 'Transcription non trouvée ou accès refusé' });
    }

    const comments = await getComments(transcriptionId);
    res.json(comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un commentaire
router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { commentId } = req.params;
    const isAdmin = (req as any).user?.role === 'ADMIN';

    await deleteComment(commentId, userId, isAdmin);
    res.json({ message: 'Commentaire supprimé' });
  } catch (error: any) {
    console.error(error);
    res.status(403).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
