// backend/src/services/commentService.ts
import { db } from '../db/knex';
import { emitGlobal } from '../socketManager';
import { logger } from '../utils/logger';

export type CommentDocumentType = 'transcription' | 'memo' | 'collaboration' | 'file';

const generateId = (): string =>
  `c-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ✅ Sanitize basique (anti-XSS)
const sanitizeContent = (content: string): string => {
  return content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '') // supprime TOUTES les balises HTML
    .trim();
};

// ============================================================
// ✅ Récupérer le projetId selon le type de document
// ============================================================
const getProjectIdForDocument = async (
  documentId: string,
  documentType: CommentDocumentType
): Promise<string | null> => {
  if (documentType === 'transcription') {
    const doc = await db('transcriptions').where({ id: documentId }).select('projectId').first();
    return doc?.projectId || null;
  }
  if (documentType === 'memo') {
    const doc = await db('memos').where({ id: documentId }).select('projectId').first();
    return doc?.projectId || null;
  }
  if (documentType === 'collaboration') {
    const doc = await db('collaboration_documents').where({ id: documentId }).select('projectId').first();
    return doc?.projectId || null;
  }
  if (documentType === 'file') {
    const doc = await db('project_files').where({ id: documentId }).select('projectId').first();
    return doc?.projectId || null;
  }
  return null;
};

// ============================================================
// ✅ Vérifier l'accès : propriétaire OU membre du projet
// ============================================================
export const canAccessDocument = async (
  documentId: string,
  documentType: CommentDocumentType,
  userId: string
): Promise<boolean> => {
  const projectId = await getProjectIdForDocument(documentId, documentType);
  if (!projectId) return false;

  const member = await db('project_members')
    .where({ projectId, userId })
    .first();

  return !!member;
};

// ============================================================
// ✅ AJOUTER UN COMMENTAIRE
// ============================================================
export const addComment = async (
  documentId: string,
  documentType: CommentDocumentType,
  userId: string,
  content: string,
  parentId: string | null = null
): Promise<string> => {
  const cleanContent = sanitizeContent(content);
  if (cleanContent.length < 1) throw new Error('Contenu vide');
  if (cleanContent.length > 5000) throw new Error('Contenu trop long (5000 max)');

  // ✅ Si parentId fourni, vérifier que le parent existe
  if (parentId) {
    const parent = await db('comments').where({ id: parentId }).first();
    if (!parent) throw new Error('Commentaire parent introuvable');
    if (parent.documentId !== documentId) {
      throw new Error('Le commentaire parent appartient à un autre document');
    }
  }

  const id = generateId();
  const now = new Date().toISOString();

  await db('comments').insert({
    id,
    documentId,
    documentType,
    userId,
    content: cleanContent,
    parentId,
    createdAt: now,
    updatedAt: now,
  });

  const projectId = await getProjectIdForDocument(documentId, documentType);

  logger.info(`💬 [comment] Ajouté par ${userId} sur ${documentType}/${documentId}`);

  // ✅ Notification temps réel
  if (projectId) {
    const user = await db('users').where({ id: userId }).first();
    emitGlobal('comment-created', {
      projectId,
      documentId,
      documentType,
      commentId: id,
      actorId: userId,
      actorName: user?.name || user?.email || 'Utilisateur',
      timestamp: now,
    });
  }

  return id;
};

// ============================================================
// ✅ RÉCUPÉRER LES COMMENTAIRES D'UN DOCUMENT (avec nested)
// ============================================================
export const getComments = async (
  documentId: string,
  documentType: CommentDocumentType
) => {
  // ✅ Récupérer tous les commentaires racine + leurs réponses
  const allComments = await db('comments')
    .join('users', 'comments.userId', 'users.id')
    .where('comments.documentId', documentId)
    .where('comments.documentType', documentType)
    .whereNull('comments.deletedAt')
    .select(
      'comments.id',
      'comments.content',
      'comments.parentId',
      'comments.userId',
      'comments.createdAt',
      'comments.updatedAt',
      'users.name as userName',
      'users.email as userEmail',
      'users.avatar as userAvatar'
    )
    .orderBy('comments.createdAt', 'asc');

  // ✅ Construire l'arbre nested
  const rootComments = allComments.filter((c: any) => !c.parentId);
  const repliesMap = new Map<string, any[]>();

  allComments.forEach((c: any) => {
    if (c.parentId) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, []);
      repliesMap.get(c.parentId)!.push(c);
    }
  });

  return rootComments.map((root: any) => ({
    ...root,
    replies: repliesMap.get(root.id) || [],
  }));
};

// ============================================================
// ✅ SUPPRIMER (soft delete)
// ============================================================
export const deleteComment = async (
  commentId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> => {
  const comment = await db('comments').where({ id: commentId }).first();
  if (!comment) throw new Error('Commentaire introuvable');

  // ✅ Vérifier : propriétaire OU admin OU membre du projet (pour modération)
  if (comment.userId !== userId && !isAdmin) {
    const canModerate = await canAccessDocument(
      comment.documentId,
      comment.documentType,
      userId
    );
    if (!canModerate) throw new Error('Non autorisé');
  }

  await db('comments')
    .where({ id: commentId })
    .update({ deletedAt: new Date().toISOString() });
};

// ============================================================
// ✅ ÉDITER UN COMMENTAIRE (auteur uniquement)
// ============================================================
export const updateComment = async (
  commentId: string,
  userId: string,
  content: string
): Promise<void> => {
  const comment = await db('comments').where({ id: commentId }).first();
  if (!comment) throw new Error('Commentaire introuvable');
  if (comment.userId !== userId) throw new Error('Seul l\'auteur peut modifier');

  const cleanContent = sanitizeContent(content);
  if (cleanContent.length < 1) throw new Error('Contenu vide');

  await db('comments')
    .where({ id: commentId })
    .update({ content: cleanContent, updatedAt: new Date().toISOString() });
};

// ============================================================
// ✅ COMPTER LES COMMENTAIRES D'UN DOCUMENT
// ============================================================
export const countComments = async (
  documentId: string,
  documentType: CommentDocumentType
): Promise<number> => {
  const result = await db('comments')
    .where({ documentId, documentType })
    .whereNull('deletedAt')
    .count('id as count');
  return Number(result[0]?.count || 0);
};
