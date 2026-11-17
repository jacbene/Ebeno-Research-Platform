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
// Suppression à partir d'une URL stockée en base (avatar, etc.)
// ═══════════════════════════════════════════════════════════

export interface ParsedStorageUrl {
  provider: 'cloudinary' | 'minio';
  key: string; // publicId Cloudinary ou clé d'objet MinIO
}

/**
 * Extrait le publicId (Cloudinary) ou la clé d'objet (MinIO) d'une URL déjà stockée en base.
 * Retourne null si l'URL n'est pas reconnue (URL externe, data:, vide…).
 */
export function parseStorageUrl(rawUrl: string): ParsedStorageUrl | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const value = rawUrl.trim();
  if (!value) return null;

  // Chemin nu (pas d'URL) : clé relative au provider courant
  if (!/^https?:\/\//i.test(value)) {
    const key = value.replace(/^\/+/, '');
    return key ? { provider: PROVIDER, key } : null;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const path = decodeURIComponent(url.pathname);

  // MinIO path-style : /<bucket>/<clé>
  const bucket = process.env.MINIO_BUCKET || 'ebeno-files';
  const marker = `/${bucket}/`;
  const at = path.indexOf(marker);
  if (at !== -1) {
    const key = path.slice(at + marker.length);
    return key ? { provider: 'minio', key } : null;
  }

  // Cloudinary : /<cloud>/image|video|raw/upload/[v123/]<publicId>[.ext]
  if (/res\.cloudinary\.com$/i.test(url.hostname)) {
    const m = path.match(/\/(?:image|video|raw)\/upload\/(?:v\d+\/)?(.+)$/);
    if (m) {
      return {
        provider: 'cloudinary',
        key: m[1].replace(/\.[a-z0-9]{1,5}$/i, ''),
      };
    }
  }

  return null;
}

/**
 * Supprime un fichier à partir de l'URL/du chemin stocké en base, quel que soit le provider
 * qui l'a produit (nécessaire après une migration Cloudinary → MinIO).
 * Retourne false si l'URL n'est pas reconnue (on ne supprime rien).
 */
export async function deleteFileByUrl(rawUrl: string): Promise<boolean> {
  const parsed = parseStorageUrl(rawUrl);
  if (!parsed) {
    logger.warn(`⚠️ [storage] URL non reconnue, suppression ignorée : ${String(rawUrl).slice(0, 120)}`);
    return false;
  }
  if (parsed.provider === 'minio') {
    await deleteFromMinio(parsed.key);
  } else {
    await deleteFromCloudinary(parsed.key);
  }
  return true;
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
