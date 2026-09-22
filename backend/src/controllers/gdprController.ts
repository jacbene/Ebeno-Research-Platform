// backend/src/controllers/gdprController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import { logAuditFromReq } from '../services/auditLogService';
import { decrypt } from '../services/encryptionService';

// ============================================================
// Helpers de déchiffrement
// ============================================================

const decryptField = (encrypted: string | null, fallback: string | null): string | null => {
  if (encrypted) {
    const d = decrypt(encrypted);
    if (d) return d;
  }
  return fallback;
};

// ============================================================
// EXPORT RGPD COMPLET
// ============================================================

/**
 * GET /api/users/me/export-data
 * Retourne un JSON complet avec toutes les données personnelles de l'utilisateur.
 * Conforme RGPD Article 20 (droit à la portabilité).
 */
export const exportMyData = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    logger.info(`📦 [RGPD] Début export pour user ${userId}`);

    // ============================================================
    // 1. Profil utilisateur
    // ============================================================
    const userRaw = await db('users').where({ id: userId }).first();
    if (!userRaw) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const user = {
      id: userRaw.id,
      email: decryptField(userRaw.emailEncrypted, userRaw.email),
      name: userRaw.name,
      role: userRaw.role,
      avatar: userRaw.avatar,
      bio: decryptField(userRaw.bioEncrypted, userRaw.bio),
      institution: decryptField(userRaw.institutionEncrypted, userRaw.institution),
      isVerified: userRaw.isVerified,
      createdAt: userRaw.createdAt,
      updatedAt: userRaw.updatedAt,
      // ⚠️ password JAMAIS exporté
      // ⚠️ tokens jamais exportés
    };

    // ============================================================
    // 2. Projets (dont l'utilisateur est membre)
    // ============================================================
    const projects = await db('projects')
      .join('project_members', 'projects.id', 'project_members.projectId')
      .where('project_members.userId', userId)
      .select(
        'projects.id',
        'projects.title',
        'projects.description',
        'projects.status',
        'projects.visibility',
        'projects.createdAt',
        'projects.updatedAt',
        'project_members.role as myRole'
      );

    const projectIds = projects.map((p: any) => p.id);

    // ============================================================
    // 3. Transcriptions (audio + textes)
    // ============================================================
    const transcriptions = await db('transcriptions')
      .where({ userId })
      .select(
        'id', 'title', 'type', 'status', 'transcriptText',
        'audioUrl', 'fileName', 'language',
        'projectId', 'createdAt', 'updatedAt', 'deletedAt'
      );

    // ============================================================
    // 4. Memos
    // ============================================================
    const memos = await db('memos')
      .where({ userId })
      .select('id', 'title', 'content', 'projectId', 'language', 'createdAt', 'updatedAt', 'deletedAt');

    // ============================================================
    // 5. Fichiers uploadés
    // ============================================================
    const files = await db('project_files')
      .where({ userId })
      .select(
        'id', 'fileName', 'fileSize', 'mimeType', 'filePath',
        'projectId', 'language', 'uploadedAt', 'deletedAt'
      );

    // ============================================================
    // 6. Documents collaboratifs créés
    // ============================================================
    let collaborationDocs: any[] = [];
    if (projectIds.length > 0) {
      collaborationDocs = await db('collaboration_documents')
        .where({ createdBy: userId })
        .select('id', 'title', 'content', 'projectId', 'version', 'createdAt', 'updatedAt');
    }

    // ============================================================
    // 7. Codes créés
    // ============================================================
    const codes = await db('codes')
      .where({ userId })
      .select('id', 'name', 'description', 'color', 'projectId', 'createdAt', 'updatedAt');

    // ============================================================
    // 8. Activité (dans les projets de l'utilisateur)
    // ============================================================
    let activity: any[] = [];
    if (projectIds.length > 0) {
      activity = await db('project_activity')
        .where({ userId })
        .select('id', 'projectId', 'action', 'targetType', 'targetName', 'createdAt')
        .orderBy('createdAt', 'desc')
        .limit(500); // limitation raisonnable
    }

    // ============================================================
    // 9. Audit log (actions de l'utilisateur)
    // ============================================================
    const auditLog = await db('audit_log')
      .where({ userId })
      .select('id', 'action', 'targetType', 'targetName', 'ip', 'userAgent', 'status', 'createdAt')
      .orderBy('createdAt', 'desc')
      .limit(1000);

    // ============================================================
    // 10. Résumés IA générés sur ses documents
    // ============================================================
    let summaries: any[] = [];
    const docIds = [
      ...transcriptions.map((t: any) => t.id),
      ...memos.map((m: any) => m.id),
      ...files.map((f: any) => f.id),
    ];

    if (docIds.length > 0) {
      summaries = await db('document_summaries')
        .whereIn('documentId', docIds)
        .select('id', 'documentId', 'type', 'summary', 'createdAt', 'updatedAt');
    }

    // ============================================================
    // 11. Entités extraites (personnes, lieux, orgs) liées aux documents
    // ============================================================
    let entities: any[] = [];
    if (docIds.length > 0) {
      entities = await db('document_entities')
        .whereIn('documentId', docIds)
        .select('id', 'documentId', 'entityType', 'entityValue', 'occurrenceCount', 'createdAt');
    }

    // ============================================================
    // Construction de l'objet final
    // ============================================================
    const exportData = {
      exported_at: new Date().toISOString(),
      export_version: '1.0',
      rgpd_notice: {
        framework: 'RGPD Article 20 — Droit à la portabilité',
        format: 'JSON (UTF-8)',
        contains: 'Toutes les données personnelles et contenus créés par l\'utilisateur',
        excludes: 'Mot de passe, tokens, données d\'autres utilisateurs',
      },
      summary: {
        projects: projects.length,
        transcriptions: transcriptions.length,
        memos: memos.length,
        files: files.length,
        collaborationDocs: collaborationDocs.length,
        codes: codes.length,
        activityEntries: activity.length,
        auditEntries: auditLog.length,
        summaries: summaries.length,
        entities: entities.length,
      },
      user,
      projects,
      transcriptions,
      memos,
      files,
      collaborationDocs,
      codes,
      activity,
      auditLog,
      summaries,
      entities,
    };

    // ============================================================
    // Log audit (l'export lui-même)
    // ============================================================
    await logAuditFromReq(req, {
      userId,
      userEmail: user.email || undefined,
      action: 'gdpr_export',
      targetType: 'user',
      targetId: userId,
      status: 'success',
      metadata: {
        durationMs: Date.now() - startTime,
        counts: exportData.summary,
      },
    });

    // ============================================================
    // Nom de fichier + headers
    // ============================================================
    const safeName = (user.name || 'user')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 30);

    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `ebeno_export_${safeName}_${dateStr}.json`;

    logger.info(
      `✅ [RGPD] Export terminé pour user ${userId} (${Date.now() - startTime}ms)`
    );

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error: any) {
    logger.error('❌ [RGPD] Erreur export:', error);

    // Log audit échec
    try {
      await logAuditFromReq(req, {
        userId: (req as any).user?.id,
        action: 'gdpr_export_failed',
        targetType: 'user',
        status: 'failure',
        metadata: { error: error.message },
      });
    } catch {}

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'export de vos données',
      error: error.message,
    });
  }
};

/**
 * GET /api/users/me/export-info
 * Retourne un résumé de ce qui SERAIT exporté (sans générer le JSON).
 * Utile pour afficher un aperçu dans l'UI avant de lancer l'export.
 */
export const getExportInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const [projects, transcriptions, memos, files, codes] = await Promise.all([
      db('projects')
        .join('project_members', 'projects.id', 'project_members.projectId')
        .where('project_members.userId', userId)
        .count('projects.id as count')
        .first(),
      db('transcriptions').where({ userId }).count('id as count').first(),
      db('memos').where({ userId }).count('id as count').first(),
      db('project_files').where({ userId }).count('id as count').first(),
      db('codes').where({ userId }).count('id as count').first(),
    ]);

    res.json({
      success: true,
      data: {
        counts: {
          projects: Number((projects as any)?.count || 0),
          transcriptions: Number((transcriptions as any)?.count || 0),
          memos: Number((memos as any)?.count || 0),
          files: Number((files as any)?.count || 0),
          codes: Number((codes as any)?.count || 0),
        },
        exportUrl: '/api/users/me/export-data',
        format: 'JSON',
        note: 'L\'export peut être volumineux si vous avez beaucoup de documents. Il se téléchargera automatiquement.',
      },
    });
  } catch (error: any) {
    logger.error('❌ [RGPD] Erreur export-info:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
