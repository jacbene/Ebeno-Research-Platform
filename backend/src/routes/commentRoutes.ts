// backend/src/routes/commentRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  addComment,
  getComments,
  deleteComment,
  updateComment,
  canAccessDocument,
  countComments,
  CommentDocumentType,
} from '../services/commentService';
import { logger } from '../utils/logger';

const router = Router();

const VALID_TYPES: CommentDocumentType[] = ['transcription', 'memo', 'collaboration', 'file'];

const isValidType = (t: string): t is CommentDocumentType =>
  VALID_TYPES.includes(t as CommentDocumentType);

// ============================================================
// ✅ AJOUTER UN COMMENTAIRE
// ============================================================
router.post('/:documentType/:documentId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { documentType, documentId } = req.params;
    const { content, parentId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!isValidType(documentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Le contenu est requis' });
    }

    // ✅ Vérifier l'accès au document (membre du projet)
    const hasAccess = await canAccessDocument(documentId, documentType, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès refusé à ce document' });
    }

    const commentId = await addComment(
      documentId,
      documentType,
      userId,
      content.trim(),
      parentId || null
    );

    const newComment = await db('comments')
      .join('users', 'comments.userId', 'users.id')
      .where('comments.id', commentId)
      .select(
        'comments.id',
        'comments.content',
        'comments.parentId',
        'comments.userId',
        'comments.createdAt',
        'users.name as userName',
        'users.email as userEmail',
        'users.avatar as userAvatar'
      )
      .first();

    res.status(201).json({ ...newComment, replies: [] });
  } catch (error: any) {
    logger.error(`❌ [comments] addComment: ${error.message}`);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================
// ✅ LISTER LES COMMENTAIRES D'UN DOCUMENT
// ============================================================
router.get('/:documentType/:documentId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { documentType, documentId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!isValidType(documentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const hasAccess = await canAccessDocument(documentId, documentType, userId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Accès refusé à ce document' });
    }

    const comments = await getComments(documentId, documentType);
    res.json({ success: true, comments, count: comments.length });
  } catch (error: any) {
    logger.error(`❌ [comments] getComments: ${error.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ✅ COMPTER LES COMMENTAIRES (léger — pour badges UI)
// ============================================================
router.get('/:documentType/:documentId/count', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { documentType, documentId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!isValidType(documentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const hasAccess = await canAccessDocument(documentId, documentType, userId);
    if (!hasAccess) return res.status(403).json({ error: 'Accès refusé' });

    const count = await countComments(documentId, documentType);
    res.json({ success: true, count });
  } catch (error: any) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============================================================
// ✅ ÉDITER UN COMMENTAIRE
// ============================================================
router.put('/:commentId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { commentId } = req.params;
    const { content } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Contenu requis' });
    }

    await updateComment(commentId, userId, content.trim());
    res.json({ success: true, message: 'Commentaire modifié' });
  } catch (error: any) {
    logger.error(`❌ [comments] updateComment: ${error.message}`);
    res.status(403).json({ error: error.message || 'Erreur serveur' });
  }
});

// ============================================================
// ✅ SUPPRIMER (soft delete)
// ============================================================
router.delete('/:commentId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { commentId } = req.params;
    const isAdmin = (req as any).user?.role === 'ADMIN';

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    await deleteComment(commentId, userId, isAdmin);
    res.json({ success: true, message: 'Commentaire supprimé' });
  } catch (error: any) {
    logger.error(`❌ [comments] deleteComment: ${error.message}`);
    res.status(403).json({ error: error.message || 'Erreur serveur' });
  }
});

// ✅ Import db pour la requête dans POST
import { db } from '../db/knex';

export default router;
