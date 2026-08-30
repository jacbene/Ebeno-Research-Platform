import { db } from '../db/knex';

export const saveVersion = async (documentId: string, content: string, userId: string) => {
  const versionNumber = await db('document_versions')
    .where({ document_id: documentId })
    .max('version_number as max')
    .first()
    .then(row => (row?.max || 0) + 1);

  await db('document_versions').insert({
    id: Date.now().toString(),
    document_id: documentId,
    content,
    version_number: versionNumber,
    user_id: userId,
    created_at: Date.now()
  });
};

export const getVersions = async (documentId: string) => {
  return db('document_versions')
    .join('users', 'document_versions.user_id', 'users.id')
    .where('document_versions.document_id', documentId)
    .select('document_versions.*', 'users.name as userName')
    .orderBy('document_versions.version_number', 'asc');
};

export const restoreVersion = async (documentId: string, versionNumber: number) => {
  const version = await db('document_versions')
    .where({ document_id: documentId, version_number: versionNumber })
    .first();
  if (!version) throw new Error('Version introuvable');

  // Mettre à jour le document
  await db('collaboration_documents')
    .where({ id: documentId })
    .update({ content: version.content, updated_at: Date.now() });

  return version.content;
};
