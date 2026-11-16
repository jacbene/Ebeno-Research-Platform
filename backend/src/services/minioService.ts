// backend/src/services/minioService.ts
/**
 * Client MinIO (S3-compatible) pour stockage fichiers self-hosted.
 *
 * Utilisation via storageService.ts (abstraction Cloudinary/MinIO).
 * Variables requises : MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'http://minio:9000';
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || '';
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || '';
const MINIO_BUCKET = process.env.MINIO_BUCKET || 'ebeno-files';
const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL || MINIO_ENDPOINT;

// ═══════════════════════════════════════════════════════════
// Client singleton
// ═══════════════════════════════════════════════════════════

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      endpoint: MINIO_ENDPOINT,
      region: 'us-east-1',
      forcePathStyle: true, // ⚠️ OBLIGATOIRE pour MinIO (sinon virtual-hosted-style cassé)
      credentials: {
        accessKeyId: MINIO_ACCESS_KEY,
        secretAccessKey: MINIO_SECRET_KEY,
      },
    });
  }
  return client;
}

export function isMinioConfigured(): boolean {
  return !!(MINIO_ENDPOINT && MINIO_ACCESS_KEY && MINIO_SECRET_KEY);
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const MIME_TO_EXT: Record<string, string> = {
  'text/markdown': 'md',
  'text/plain': 'txt',
  'application/pdf': 'pdf',
  'application/json': 'json',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/webm': 'webm',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function buildKey(folder: string, mimeType: string): string {
  const ext = MIME_TO_EXT[mimeType] || 'bin';
  const rand = Math.random().toString(36).slice(2, 10);
  return `${folder}/${Date.now()}-${rand}.${ext}`;
}

// ═══════════════════════════════════════════════════════════
// Upload
// ═══════════════════════════════════════════════════════════

export interface MinioUploadResult {
  key: string;
  secureUrl: string;   // même nom de champ que Cloudinary pour compat
  publicId: string;
}

export async function uploadToMinio(
  buffer: Buffer,
  folder: string,
  mimeType: string,
): Promise<MinioUploadResult> {
  if (!isMinioConfigured()) {
    throw new Error(
      'MinIO non configuré (MINIO_ACCESS_KEY / MINIO_SECRET_KEY manquants)',
    );
  }

  const key = buildKey(folder, mimeType);
  const s3 = getClient();

  await s3.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );

  const url = `${MINIO_PUBLIC_URL}/${MINIO_BUCKET}/${key}`;
  logger.info(`✅ [minio] Upload OK : ${key} (${buffer.length} bytes, ${mimeType})`);

  return { key, secureUrl: url, publicId: key };
}

// ═══════════════════════════════════════════════════════════
// Suppression
// ═══════════════════════════════════════════════════════════

export async function deleteFromMinio(key: string): Promise<void> {
  if (!isMinioConfigured()) return;
  const s3 = getClient();
  await s3.send(new DeleteObjectCommand({ Bucket: MINIO_BUCKET, Key: key }));
  logger.info(`🗑️ [minio] Supprimé : ${key}`);
}

// ═══════════════════════════════════════════════════════════
// URL signée (accès temporaire à un fichier privé)
// ═══════════════════════════════════════════════════════════

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  if (!isMinioConfigured()) throw new Error('MinIO non configuré');
  const s3 = getClient();
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: MINIO_BUCKET, Key: key }),
    { expiresIn },
  );
}

// ═══════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════

export async function pingMinio(): Promise<boolean> {
  if (!isMinioConfigured()) return false;
  try {
    const s3 = getClient();
    await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
    return true;
  } catch (err: any) {
    logger.warn(`⚠️ [minio] ping échoué : ${err.message}`);
    return false;
  }
}
