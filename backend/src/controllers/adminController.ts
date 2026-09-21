// backend/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * GET /api/admin/backup/cloudinary
 * Retourne la liste complète des ressources Cloudinary (JSON).
 * Protégé par header `x-admin-token` = ADMIN_TOKEN.
 */
export const backupCloudinary = async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken) {
      return res.status(500).json({
        success: false,
        message: 'ADMIN_TOKEN non configuré sur le serveur',
      });
    }

    if (adminToken !== expectedToken) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    logger.info('☁️ [admin] Démarrage du backup Cloudinary');

    const allResources: any[] = [];
    let nextCursor: string | undefined = undefined;

    // Pagination Cloudinary (max 500 par page)
    do {
      const result: any = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 500,
        next_cursor: nextCursor,
      });

      allResources.push(...result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    // Idem pour les fichiers raw (PDF, DOCX...)
    nextCursor = undefined;
    do {
      const result: any = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'raw',
        max_results: 500,
        next_cursor: nextCursor,
      });

      allResources.push(...result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    // Idem pour les vidéos
    nextCursor = undefined;
    do {
      const result: any = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'video',
        max_results: 500,
        next_cursor: nextCursor,
      });

      allResources.push(...result.resources);
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const backup = {
      timestamp: new Date().toISOString(),
      totalResources: allResources.length,
      resources: allResources.map((r) => ({
        public_id: r.public_id,
        url: r.url,
        secure_url: r.secure_url,
        format: r.format,
        resource_type: r.resource_type,
        bytes: r.bytes,
        created_at: r.created_at,
      })),
    };

    logger.info(`☁️ [admin] Backup Cloudinary : ${allResources.length} ressources`);

    // Force le téléchargement
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=cloudinary_backup_${Date.now()}.json`
    );
    res.send(JSON.stringify(backup, null, 2));
  } catch (error: any) {
    logger.error('❌ [admin] Erreur backup Cloudinary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/backup/db-info
 * Retourne des infos sur la DB (nombre de lignes par table).
 * Utile pour vérifier l'intégrité après restauration.
 */
export const dbInfo = async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;

    if (adminToken !== expectedToken) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const tables = [
      'users',
      'projects',
      'project_members',
      'project_files',
      'transcriptions',
      'memos',
      'collaboration_documents',
      'document_entities',
      'document_summaries',
      'codes',
      'project_activity',
    ];

    const counts: Record<string, number> = {};
    for (const table of tables) {
      try {
        const result = await db(table).count('* as count').first();
        counts[table] = Number(result?.count || 0);
      } catch {
        counts[table] = -1; // Table inexistante
      }
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      counts,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
