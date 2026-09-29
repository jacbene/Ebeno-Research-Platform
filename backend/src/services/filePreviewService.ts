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
  // ✅ Fichiers uploadés en type "upload" → PUBLICS → pas de signature nécessaire.
  // L'ancienne implémentation signait et Cloudinary renvoyait 400.
  // On retourne l'URL publique telle quelle.
  return url;
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
// ============================================================
// ✅ Détection du type réel par magic bytes
// ============================================================
const detectBufferType = (buffer: Buffer): 'zip' | 'pdf' | 'html' | 'image' | 'text' | 'unknown' => {
  if (buffer.length < 4) return 'unknown';

  // ZIP (DOCX, XLSX, PPTX) — PK\x03\x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return 'zip';
  }

  // PDF — %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'pdf';
  }

  // JPEG — FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image';
  }

  // PNG — 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image';
  }

  // GIF — GIF8
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image';
  }

  // HTML — commencer par <!DOCTYPE ou <html
  const start = buffer.slice(0, 500).toString('utf-8').trim().toLowerCase();
  if (start.startsWith('<!doctype') || start.startsWith('<html')) {
    return 'html';
  }

  // Sinon, on regarde si c'est du texte pur (que des caractères imprimables)
  const sample = buffer.slice(0, 500).toString('utf-8');
  const printableRatio = sample.split('').filter((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 || c === '\n' || c === '\r' || c === '\t';
  }).length / Math.max(sample.length, 1);

  if (printableRatio > 0.9) return 'text';

  return 'unknown';
};

// ============================================================
// ✅ Extrait le contenu du <body> d'un HTML
// ============================================================
const extractBodyContent = (html: string): string => {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : html;
};

// ============================================================
// ✅ FONCTION PRINCIPALE (mise à jour)
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

  // ─── DOCX / DOC : détection par magic bytes ───────────────
  if (['docx', 'doc'].includes(ext) || mime.includes('word') || mime.includes('wordprocessingml')) {
    const buffer = await downloadBuffer(file.filePath);
    if (!buffer) {
      return { type: 'unsupported', editable: false, meta: baseMeta };
    }

    const realType = detectBufferType(buffer);

    // ✅ Vrai DOCX (ZIP) → mammoth
    if (realType === 'zip') {
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

    // ✅ Notre DOCX généré (HTML) → extraire le <body>
    if (realType === 'html') {
      const fullHtml = buffer.toString('utf-8');
      const content = extractBodyContent(fullHtml);
      logger.info(`✅ [preview] HTML-as-DOC détecté pour ${file.fileName}`);
      return {
        type: 'html',
        content,
        editable: true,
        editFormat: 'html',
        meta: baseMeta,
      };
    }

    // ⚠️ Fichier .docx corrompu ou format inconnu
    logger.warn(`⚠️ [preview] Fichier .docx non reconnu (${realType})`);
    return { type: 'unsupported', editable: false, meta: baseMeta };
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

  // ─── PDF ─────────────────────────────────────────────────
  if (ext === 'pdf' || mime === 'application/pdf') {
    return { type: 'pdf', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  // ─── Images ──────────────────────────────────────────────
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mime.startsWith('image/')) {
    return { type: 'image', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  // ─── Vidéo ───────────────────────────────────────────────
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext) || mime.startsWith('video/')) {
    return { type: 'video', signedUrl: getSignedUrl(file.filePath), editable: false, meta: baseMeta };
  }

  // ─── Audio ───────────────────────────────────────────────
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
