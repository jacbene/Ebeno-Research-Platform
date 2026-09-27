// backend/src/services/filePreviewService.ts
// ✅ Preview de fichiers (DOCX → HTML, PDF/img signés, TXT brut)

import mammoth from 'mammoth';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { extractTextFromUrl } from './textExtractor';

cloudinary.config();

export type PreviewType = 'html' | 'text' | 'pdf' | 'image' | 'video' | 'audio' | 'unsupported';

export interface FilePreview {
  type: PreviewType;
  content?: string;      // Pour HTML/text
  signedUrl?: string;    // Pour PDF/img/vidéo/audio
  editable: boolean;     // Peut être édité en ligne ?
  editFormat?: 'html' | 'text'; // Format d'édition
  meta: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    version: number;
  };
}

// ============================================================
// Génère une URL Cloudinary signée
// ============================================================
const getSignedUrl = (url: string): string => {
  if (!url.includes('res.cloudinary.com')) return url;

  const match = url.match(/res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/v\d+\/(.+)$/);
  if (!match) return url;

  const resourceType = match[1];
  const publicId = match[2];

  try {
    const signedUrl = cloudinary.utils.private_download_url(publicId, resourceType, {
      resource_type: resourceType,
      type: 'upload',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
    return signedUrl;
  } catch (err: any) {
    logger.warn(`⚠️ [preview] Signed URL failed: ${err.message}`);
    return url;
  }
};

// ============================================================
// Télécharge le contenu d'un fichier (URL ou chemin local)
// ============================================================
const downloadBuffer = async (filePath: string): Promise<Buffer | null> => {
  try {
    if (filePath.startsWith('http')) {
      const url = getSignedUrl(filePath);
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const fs = require('fs');
    if (!fs.existsSync(filePath)) return null;
    return await fs.promises.readFile(filePath);
  } catch (err: any) {
    logger.warn(`⚠️ [preview] Download failed: ${err.message}`);
    return null;
  }
};

// ============================================================
// ✅ FONCTION PRINCIPALE
// ============================================================
export const getFilePreview = async (
  fileId: string,
  userId: string
): Promise<FilePreview | null> => {
  // 1. Récupérer le fichier
  const file = await db('project_files').where({ id: fileId }).first();
  if (!file) return null;

  // 2. Vérifier que l'user est membre du projet
  const member = await db('project_members')
    .where({ projectId: file.projectId, userId })
    .first();
  if (!member) return null;

  const ext = (file.fileName.split('.').pop() || '').toLowerCase();
  const mime = file.mimeType || '';
  const baseMeta = {
    fileName: file.fileName,
    mimeType: mime,
    fileSize: file.fileSize,
    version: file.version || 1,
  };

  // ─── DOCX / DOC : HTML via mammoth ───────────────────────
  if (['docx'].includes(ext) || mime.includes('wordprocessingml')) {
    const buffer = await downloadBuffer(file.filePath);
    if (!buffer) {
      return { type: 'unsupported', editable: false, meta: baseMeta };
    }

    try {
      const result = await mammoth.convertToHtml({ buffer });
      return {
        type: 'html',
        content: result.value || '<p><em>Document vide</em></p>',
        editable: true,
        editFormat: 'html',
        meta: baseMeta,
      };
    } catch (err: any) {
      logger.error(`❌ [preview] mammoth error: ${err.message}`);
      return { type: 'unsupported', editable: false, meta: baseMeta };
    }
  }

  // ─── TXT / MD / CSV / JSON ───────────────────────────────
  if (['txt', 'md', 'csv', 'json', 'xml'].includes(ext) || mime.includes('text/plain')) {
    const buffer = await downloadBuffer(file.filePath);
    if (!buffer) return { type: 'unsupported', editable: false, meta: baseMeta };

    return {
      type: 'text',
      content: buffer.toString('utf-8'),
      editable: true,
      editFormat: 'text',
      meta: baseMeta,
    };
  }

  // ─── PDF / Images / Vidéo / Audio : URL signée ───────────
  if (ext === 'pdf' || mime === 'application/pdf') {
    return { type: 'pdf', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return { type: 'image', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  if (['mp4', 'webm', 'mov', 'avi'].includes(ext) || mime.startsWith('video/')) {
    return { type: 'video', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  if (['mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext) || mime.startsWith('audio/')) {
    return { type: 'audio', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  // ─── Fallback ────────────────────────────────────────────
  return { type: 'unsupported', editable: false, meta: baseMeta };
};

// ============================================================
// ✅ RÉCUPÉRER LE TEXTE BRUT (pour traduction)
// ============================================================
export const getFileTextForTranslation = async (
  fileId: string,
  userId: string
): Promise<string> => {
  const file = await db('project_files').where({ id: fileId }).first();
  if (!file) throw new Error('Fichier non trouvé');

  const member = await db('project_members')
    .where({ projectId: file.projectId, userId })
    .first();
  if (!member) throw new Error('Accès non autorisé');

  try {
    const text = await extractTextFromUrl(file.filePath, file.mimeType);
    if (!text || text.length < 10) {
      throw new Error('Texte vide ou trop court');
    }
    return text;
  } catch (err: any) {
    throw new Error(`Impossible d'extraire le texte : ${err.message}`);
  }
};
