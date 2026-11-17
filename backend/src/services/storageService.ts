// backend/src/services/storageService.ts
/**
 * Abstraction stockage fichiers : Cloudinary (SaaS) ou MinIO (self-hosted).
 * Choix via la variable STORAGE_PROVIDER ('cloudinary' | 'minio').
 *
 * Les contrôleurs ne doivent plus importer cloudinaryService directement,
 * mais toujours passer par storageService pour bénéficier du switch.
 */

import fs from 'fs';
import {
  uploadToCloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
} from './cloudinaryService';
import {
  uploadToMinio,
  deleteFromMinio,
  getSignedDownloadUrl,
  isMinioConfigured,
  pingMinio,
} from './minioService';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// Types & config
// ═══════════════════════════════════════════════════════════

export type StorageProvider = 'cloudinary' | 'minio';

export interface StorageUploadResult {
  publicId: string;
  secureUrl: string;
}

const PROVIDER: StorageProvider = (
  (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase() as StorageProvider
);

// Log au démarrage (une seule fois au chargement du module)
logger.info(`🗄️ [storage] Provider actif : ${PROVIDER}`);

// ═══════════════════════════════════════════════════════════
// Introspection
// ═══════════════════════════════════════════════════════════

export function getStorageProvider(): StorageProvider {
  return PROVIDER;
}

export function isStorageConfigured(): boolean {
  if (PROVIDER === 'minio') return isMinioConfigured();
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
}

// ═══════════════════════════════════════════════════════════
// Upload depuis un Buffer (cas principal : éditions, exports, etc.)
// ═══════════════════════════════════════════════════════════

export async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  mimeType: string,
): Promise<StorageUploadResult> {
  if (PROVIDER === 'minio') {
    const result = await uploadToMinio(buffer, folder, mimeType);
    return { publicId: result.publicId, secureUrl: result.secureUrl };
  }
  return uploadBufferToCloudinary(buffer, folder, mimeType);
}

// ═══════════════════════════════════════════════════════════
// Upload depuis un fichier local (uploadToCloudinary legacy)
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// Upload depuis un fichier local (compat uploadToCloudinary legacy)
// ═══════════════════════════════════════════════════════════

// Petit fallback pour déduire un mimeType depuis une extension
const EXT_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
};

function guessMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

function isMimeType(value: string): boolean {
  return value.includes('/'); // 'application/pdf' vs 'auto'
}

/**
 * Upload depuis un fichier local.
 *
 * Accepte en 3ᵉ argument :
 *   - un mimeType ('application/pdf', 'image/png') → utilisé tel quel pour MinIO
 *   - un resourceType Cloudinary ('auto'|'raw'|'image'|'video') → mimeType déduit de l'extension pour MinIO
 */
export async function uploadFromFile(
  filePath: string,
  folder: string,
  mimeOrResourceType: string = 'auto',
): Promise<StorageUploadResult> {
  if (PROVIDER === 'minio') {
    const buffer = fs.readFileSync(filePath);
    const mimeType = isMimeType(mimeOrResourceType)
      ? mimeOrResourceType
      : guessMimeType(filePath);

    try {
      const result = await uploadToMinio(buffer, folder, mimeType);
      return { publicId: result.publicId, secureUrl: result.secureUrl };
    } finally {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
  }

  // Cloudinary : accepte resourceType directement
  const resourceType = isMimeType(mimeOrResourceType)
    ? 'auto'
    : mimeOrResourceType;
  return uploadToCloudinary(
    filePath,
    folder,
    resourceType as 'raw' | 'auto' | 'image' | 'video',
  );
}
 
// ═══════════════════════════════════════════════════════════
// Suppression
// ═══════════════════════════════════════════════════════════

export async function deleteFile(publicId: string): Promise<void> {
  if (PROVIDER === 'minio') {
    return deleteFromMinio(publicId);
  }
  return deleteFromCloudinary(publicId);
}

// ═══════════════════════════════════════════════════════════
// URL signée (MinIO uniquement — Cloudinary renvoie déjà secureUrl)
// ═══════════════════════════════════════════════════════════

export async function getDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (PROVIDER === 'minio') {
    return getSignedDownloadUrl(key, expiresIn);
  }
  throw new Error(
    `getDownloadUrl() non supporté avec provider "${PROVIDER}" (utiliser secureUrl stocké en DB)`,
  );
}

// ═══════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════

export async function pingStorage(): Promise<boolean> {
  if (PROVIDER === 'minio') {
    return pingMinio();
  }
  // Cloudinary : simple vérification des variables
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
}

// ═══════════════════════════════════════════════════════════
// Legacy : extraction de clé depuis URL publique
// ═══════════════════════════════════════════════════════════

/**
 * Reconstruit la clé de stockage depuis une URL publique.
 *
 * À utiliser UNIQUEMENT pour les fichiers uploadés AVANT l'ajout de
 * la persistance de la clé (fallback legacy : avatars pré-v2.6).
 * Pour tout nouvel upload, utiliser directement le `publicId` retourné
 * par uploadFromFile/uploadBuffer.
 *
 * Formats supportés :
 *   MinIO     : http://host:9000/BUCKET/avatars/USER/FILE.ext[?sig...]
 *               → retourne avatars/USER/FILE.ext
 *   Cloudinary: https://res.cloudinary.com/CLOUD/image/upload/v123/avatars/USER/FILE.ext
 *               → retourne avatars/USER/FILE (sans extension = publicId Cloudinary)
 */
export function extractLegacyStorageKey(url: string | null): string | null {
  if (!url) return null;

  if (PROVIDER === 'minio') {
    try {
      const parsed = new URL(url);
      const segments = parsed.pathname.split('/').filter(Boolean);
      // segments[0] = bucket (path-style), le reste = la clé
      if (segments.length >= 2) return segments.slice(1).join('/');
    } catch {
      // URL malformée → fallback null
    }
    return null;
  }

  // Cloudinary : publicId = path sans extension
  const match = url.match(/\/avatars\/([^/]+)\/([^/.?]+)/i);
  if (match) return `avatars/${match[1]}/${match[2]}`;
  return null;
}
