// backend/src/services/auditLogService.ts
import { Request } from 'express';
import requestIp from 'request-ip';
import { db } from '../db/knex';
import { generateId } from '../utils/generateId';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, any> | null;
  status?: 'success' | 'failure';
}

/**
 * Enregistre une action sensible dans audit_log.
 * ⚠️ Ne jamais faire planter l'action principale si l'audit échoue.
 */
export const logAudit = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await db('audit_log').insert({
      id: generateId('audit'),
      userId: entry.userId || null,
      userEmail: entry.userEmail || null,
      action: entry.action,
      targetType: entry.targetType || null,
      targetId: entry.targetId || null,
      targetName: entry.targetName || null,
      ip: entry.ip || null,
      userAgent: entry.userAgent || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      status: entry.status || 'success',
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.warn(`⚠️ [audit] Échec enregistrement (${entry.action}):`, error.message);
  }
};

/**
 * Extrait IP + User-Agent d'une requête Express.
 * Utilise request-ip pour gérer Cloudflare / Render.
 */
export const extractReqInfo = (req: Request): { ip: string | null; userAgent: string | null } => {
  return {
    ip:
      requestIp.getClientIp(req) ||
      req.ip ||
      req.socket?.remoteAddress ||
      null,
    userAgent: (req.headers['user-agent'] as string) || null,
  };
};

/**
 * Raccourci : log direct depuis une requête.
 */
export const logAuditFromReq = async (
  req: Request,
  entry: Omit<AuditLogEntry, 'ip' | 'userAgent'>,
): Promise<void> => {
  const { ip, userAgent } = extractReqInfo(req);
  await logAudit({ ...entry, ip, userAgent });
};

/**
 * Récupère les entrées d'audit avec filtres.
 */
export interface AuditQuery {
  userId?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  status?: 'success' | 'failure';
  limit?: number;
  offset?: number;
}

export const getAuditLog = async (query: AuditQuery) => {
  const limit = Math.min(Number(query.limit) || 100, 500);
  const offset = Number(query.offset) || 0;

  let q = db('audit_log').orderBy('createdAt', 'desc');

  if (query.userId) q = q.where('userId', query.userId);
  if (query.action) q = q.where('action', query.action);
  if (query.targetType) q = q.where('targetType', query.targetType);
  if (query.status) q = q.where('status', query.status);
  if (query.from) q = q.where('createdAt', '>=', query.from);
  if (query.to) q = q.where('createdAt', '<=', query.to);

  const [entries, countResult] = await Promise.all([
    q.clone().limit(limit).offset(offset),
    q.clone().count('id as count').first(),
  ]);

  const total = Number((countResult as any)?.count || 0);

  return {
    entries: entries.map((e: any) => ({
      ...e,
      metadata: e.metadata ? safeJsonParse(e.metadata) : null,
    })),
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  };
};

const safeJsonParse = (str: string): any => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};
