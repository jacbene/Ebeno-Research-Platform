import { db } from '../db/knex';

export const addComment = async (transcriptionId: string, userId: string, content: string) => {
  const id = Date.now().toString();
  await db('comments').insert({
    id,
    transcription_id: transcriptionId,
    userId: userId,
    content,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
  return id;
};

export const getComments = async (transcriptionId: string) => {
  return db('comments')
    .join('users', 'comments.userId', 'users.id')
    .where('comments.transcription_id', transcriptionId)
    .select('comments.*', 'users.name as userName', 'users.email as userEmail')
    .orderBy('comments.createdAt', 'asc');
};

export const deleteComment = async (commentId: string, userId: string, isAdmin: boolean) => {
  const comment = await db('comments').where({ id: commentId }).first();
  if (!comment) throw new Error('Commentaire introuvable');
  if (comment.userId !== userId && !isAdmin) {
    throw new Error('Non autorisé');
  }
  await db('comments').where({ id: commentId }).delete();
};
