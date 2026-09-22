// backend/src/controllers/adminController.ts
import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { getAuditLog } from '../services/auditLogService';
import { purgeOldAuditLogs } from '../services/auditPurgeService';

// Configuration Cloudinary — utilise CLOUDINARY_URL automatiquement
cloudinary.config();

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
      'audit_log',
    ];
    
    const auditRetention = Number(process.env.AUDIT_LOG_RETENTION_DAYS) || 365;
    const cutoffDate = new Date(Date.now() - auditRetention * 24 * 60 * 60 * 1000).toISOString();

    const auditStats = await db('audit_log')
      .select(
         db.raw('COUNT(*) as total'),
         db.raw(`COUNT(*) FILTER (WHERE "createdAt" < ?) as old`, [cutoffDate])
         )
       .first();

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
  auditRetention: {
    retentionDays: auditRetention,
    totalEntries: Number((auditStats as any)?.total || 0),
    entriesToPurge: Number((auditStats as any)?.old || 0),
    cutoffDate,
  },
});
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/admin/audit-log
 * Retourne les entrées d'audit avec filtres.
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const result = await getAuditLog({
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
      targetType: req.query.targetType as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      status: req.query.status as 'success' | 'failure' | undefined,
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });

    res.json({ success: true, ...result });
  } catch (error: any) {
    logger.error('❌ [admin] Erreur audit-log:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const emailDebug = async (req: Request, res: Response) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ success: false, message: 'Non autorisé' });
  }

  const users = await db('users').select('id', 'email', 'emailEncrypted', 'emailHash').limit(3);

  res.json({
    success: true,
    users: users.map((u: any) => ({
      id: u.id,
      emailClear: u.email,
      emailEncryptedPreview: u.emailEncrypted ? u.emailEncrypted.substring(0, 50) + '...' : null,
      emailHashPreview: u.emailHash ? u.emailHash.substring(0, 20) + '...' : null,
    })),
  });
};

/**
 * POST /api/admin/audit-log/purge
 * Purge manuelle des logs d'audit anciens.
 * Query params :
 *   - retentionDays (optionnel, défaut : env ou 365)
 *   - dryRun=true (pour tester sans supprimer)
 */
export const purgeAuditLogs = async (req: Request, res: Response) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    const expectedToken = process.env.ADMIN_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const retentionDays = req.query.retentionDays
      ? Number(req.query.retentionDays)
      : undefined;
    const dryRun = req.query.dryRun === 'true';

    const result = await purgeOldAuditLogs(retentionDays, dryRun);

    res.json({
      success: true,
      dryRun,
      ...result,
    });
  } catch (error: any) {
    logger.error('❌ [admin] Erreur purge audit:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
