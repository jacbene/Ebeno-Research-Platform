// backend/src/services/fileEditService.ts
// ✅ Édition de fichiers DOCX/TXT avec versioning

import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { uploadBufferToCloudinary } from './cloudinaryService';

const generateId = (): string =>
  `fv-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ============================================================
// Sanitize HTML (anti-XSS basique)
// ============================================================
const sanitizeHtml = (html: string): string => {
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
};

// ============================================================
// Enveloppe HTML → .doc (format Word compatible)
// ============================================================
const htmlToDocBuffer = (htmlContent: string, title: string): Buffer => {
  const fullHtml = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
    h1 { font-size: 20pt; }
    h2 { font-size: 16pt; }
    h3 { font-size: 14pt; }
    p { margin: 0 0 8pt 0; }
    ul, ol { margin: 0 0 8pt 20pt; padding: 0; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;
  return Buffer.from(fullHtml, 'utf-8');
};

// ============================================================
// ✅ SAUVEGARDER UNE ÉDITION
// ============================================================
export interface SaveEditOptions {
  fileId: string;
  userId: string;
  newContent: string;
  editFormat: 'html' | 'text';
}

export const saveFileEdit = async (options: SaveEditOptions): Promise<{ version: number; filePath: string }> => {
  const { fileId, userId, newContent, editFormat } = options;

  // 1. Récupérer le fichier
  const file = await db('project_files').where({ id: fileId }).first();
  if (!file) throw new Error('Fichier non trouvé');

  // 2. Vérifier membre du projet
  const member = await db('project_members')
    .where({ projectId: file.projectId, userId })
    .first();
  if (!member) throw new Error('Accès non autorisé');

  // 3. Vérifier que le format est supporté
  const ext = (file.fileName.split('.').pop() || '').toLowerCase();
  const isDocx = ext === 'docx';
  const isText = ['txt', 'md', 'csv', 'json'].includes(ext);

  if (!isDocx && !isText) {
    throw new Error(`Édition non supportée pour .${ext}`);
  }

  // 4. Backup ancien fichier dans file_versions (première fois)
  const currentVersion = file.version || 1;
  const existingBackup = await db('file_versions')
    .where({ fileId, version: currentVersion })
    .first();

  if (!existingBackup) {
    const backupId = generateId();
    await db('file_versions').insert({
      id: backupId,
      fileId,
      version: currentVersion,
      filePath: file.filePath,
      cloudinaryPublicId: file.cloudinaryPublicId || null,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      editedBy: null,
      createdAt: file.uploadedAt
        ? new Date(Number(file.uploadedAt)).toISOString()
        : new Date().toISOString(),
    });
  }

  // 5. Générer le nouveau contenu
  let newBuffer: Buffer;
  let newMimeType: string;
  let publicIdPrefix: string;

  if (editFormat === 'html') {
    const cleanHtml = sanitizeHtml(newContent);
    newBuffer = htmlToDocBuffer(cleanHtml, file.fileName.replace(/\.[^.]+$/, ''));
    newMimeType = 'application/msword';
    publicIdPrefix = file.fileName.replace(/\.[^.]+$/, '') + '_edit';
  } else {
    newBuffer = Buffer.from(newContent, 'utf-8');
    newMimeType = 'text/plain';
    publicIdPrefix = file.fileName.replace(/\.[^.]+$/, '') + '_edit';
  }

  // 6. Uploader vers Cloudinary
  const uploaded = await uploadBufferToCloudinary(
    newBuffer,
    `${file.projectId}/${publicIdPrefix}_v${currentVersion + 1}`,
    newMimeType
  );

  logger.info(`💾 [edit] Fichier ${fileId} édité par ${userId} → v${currentVersion + 1}`);

  // 7. Mettre à jour project_files
  // 7. Mettre à jour project_files
const newVersion = currentVersion + 1;
await db('project_files').where({ id: fileId }).update({
  filePath: uploaded.secureUrl,
  cloudinaryPublicId: uploaded.publicId,
  fileSize: newBuffer.length,
  mimeType: newMimeType,
  version: newVersion,
});

  // 8. Enregistrer la nouvelle version dans file_versions
  const versionId = generateId();
  await db('file_versions').insert({
    id: versionId,
    fileId,
    version: newVersion,
    filePath: uploaded.secureUrl,
    cloudinaryPublicId: uploaded.publicId,
    fileName: file.fileName,
    fileSize: newBuffer.length,
    mimeType: newMimeType,
    editedBy: userId,
    createdAt: new Date().toISOString(),
  });

  return { version: newVersion, filePath: uploaded.secureUrl };
};

// ============================================================
// ✅ LISTER LES VERSIONS D'UN FICHIER
// ============================================================
export const getFileVersions = async (fileId: string, userId: string) => {
  const file = await db('project_files').where({ id: fileId }).first();
  if (!file) throw new Error('Fichier non trouvé');

  const member = await db('project_members')
    .where({ projectId: file.projectId, userId })
    .first();
  if (!member) throw new Error('Accès non autorisé');

  return db('file_versions')
    .where({ fileId })
    .orderBy('version', 'desc');
};

// ============================================================
// ✅ RESTAURER UNE VERSION (rollback non-destructif)
// ============================================================
export const restoreFileVersion = async (
  fileId: string,
  targetVersion: number,
  userId: string
): Promise<{ version: number; filePath: string }> => {
  // 1. Récupérer le fichier
  const file = await db('project_files').where({ id: fileId }).first();
  if (!file) throw new Error('Fichier non trouvé');

  // 2. Vérifier membre du projet
  const member = await db('project_members')
    .where({ projectId: file.projectId, userId })
    .first();
  if (!member) throw new Error('Accès non autorisé');

  // 3. Récupérer la version cible
  const target = await db('file_versions')
    .where({ fileId, version: targetVersion })
    .first();

  if (!target) throw new Error(`Version v${targetVersion} introuvable`);

  const currentVersion = file.version || 1;
  if (targetVersion === currentVersion) {
    throw new Error('Vous êtes déjà sur cette version');
  }

  // 4. La nouvelle version = max existant + 1
  const maxVersionResult = await db('file_versions')
    .where({ fileId })
    .max('version as maxVersion')
    .first();
  const maxVersion = Number(maxVersionResult?.maxVersion || currentVersion);
  const newVersion = Math.max(maxVersion, currentVersion) + 1;

  logger.info(
    `🔄 [edit] Rollback fichier ${fileId} v${currentVersion} → v${targetVersion} (nouveau v${newVersion})`
  );

  // 5. Mettre à jour project_files : pointer vers le fichier de la version cible
  await db('project_files').where({ id: fileId }).update({
    filePath: target.filePath,
    cloudinaryPublicId: target.cloudinaryPublicId || null,
    fileSize: target.fileSize,
    mimeType: target.mimeType,
    version: newVersion,
  });

  // 6. Créer une nouvelle entrée dans file_versions (rollback non-destructif)
  const newId = generateId();
  await db('file_versions').insert({
    id: newId,
    fileId,
    version: newVersion,
    filePath: target.filePath,
    cloudinaryPublicId: target.cloudinaryPublicId || null,
    fileName: target.fileName,
    fileSize: target.fileSize,
    mimeType: target.mimeType,
    editedBy: userId,
    createdAt: new Date().toISOString(),
  });

  return { version: newVersion, filePath: target.filePath };
};
