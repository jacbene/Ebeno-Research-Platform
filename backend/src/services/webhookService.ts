// backend/src/services/webhookService.ts
// ✅ Service Webhooks — notifications HTTP sortantes signées HMAC-SHA256
import crypto from 'crypto';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

// ============================================================
// Constantes
// ============================================================
export const WEBHOOK_EVENTS = [
  'project.created',
  'project.updated',
  'project.deleted',
  'file.uploaded',
  'file.trashed',
  'file.edited',
  'transcription.uploaded',
  'transcription.completed',
  'memo.created',
  'comment.created',
  'member.added',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

const RETRY_DELAYS = [5000, 30000, 300000];
const DELIVERY_TIMEOUT = 15000;
const MAX_PAYLOAD_STORED = 5000;
const MAX_DELIVERIES_KEPT = 20;

// ============================================================
// ✅ PROTECTION SSRF : bloque localhost + IPs privées + metadata cloud
// ============================================================
const isPrivateHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();

  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(lower)) return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  if (lower.endsWith('.localhost')) return true;

  const match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // AWS metadata
    if (a === 127) return true;
    if (a === 0) return true;
  }

  return false;
};

export const validateWebhookUrl = (url: string): { valid: boolean; reason?: string } => {
  try {
    const parsed = new URL(url);

    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'HTTPS requis en production' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, reason: 'Protocole non supporté' };
    }

    if (isPrivateHostname(parsed.hostname)) {
      return { valid: false, reason: 'URL interne non autorisée (SSRF)' };
    }

    if (url.length > 1024) {
      return { valid: false, reason: 'URL trop longue (max 1024)' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'URL invalide' };
  }
};

// ============================================================
// Générer un secret
// ============================================================
export const generateSecret = (): string =>
  crypto.randomBytes(32).toString('hex');

// ============================================================
// Signer un payload avec HMAC-SHA256
// ============================================================
export const signPayload = (payload: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

// ============================================================
// Vérifier la signature (côté destinataire)
// ============================================================
export const verifySignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expected = signPayload(payload, secret);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
};

// ============================================================
// Récupérer les webhooks actifs abonnés à un événement
// ============================================================
const findWebhooksForEvent = async (
  event: WebhookEvent,
  projectId: string | null
): Promise<any[]> => {
  let query = db('webhooks').where({ active: true });

  // Webhooks globaux (projectId null) OU webhooks du projet concerné
  if (projectId) {
    query = query.andWhere((builder) => {
      builder.whereNull('projectId').orWhere({ projectId });
    });
  } else {
    query = query.whereNull('projectId');
  }

  const hooks = await query;

  // Filtrer par event (stored as JSON array in text)
  return hooks.filter((h: any) => {
    try {
      const events = JSON.parse(h.events || '[]');
      return events.includes(event);
    } catch {
      return false;
    }
  });
};

// ============================================================
// Envoyer un webhook avec 3 tentatives
// ============================================================
const deliverWebhook = async (
  hook: any,
  event: WebhookEvent,
  payload: any,
  attempt: number = 1
): Promise<void> => {
  const deliveryId = `wd-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  const body = JSON.stringify({
    event,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const signature = signPayload(body, hook.secret);
  const startTime = Date.now();

  try {
  const check = validateWebhookUrl(hook.url);
if (!check.valid) {
  logger.warn(`🚫 [webhook] URL bloquée: ${hook.url} (${check.reason})`);
  return; // ou return { success: false, ... } pour testWebhook
}
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT);

    const response = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ebeno-Research-Webhook/1.0',
        'X-Ebeno-Event': event,
        'X-Ebeno-Signature': `sha256=${signature}`,
        'X-Ebeno-Delivery': deliveryId,
        'X-Ebeno-Attempt': String(attempt),
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const duration = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    // Log la livraison
    await db('webhook_deliveries').insert({
      id: deliveryId,
      webhookId: hook.id,
      event,
      statusCode: response.status,
      success,
      attempt,
      durationMs: duration,
      errorMessage: success ? null : `HTTP ${response.status}`,
      payload: body.length > MAX_PAYLOAD_STORED
        ? body.substring(0, MAX_PAYLOAD_STORED) + '...[truncated]'
        : body,
      createdAt: new Date().toISOString(),
    });

    if (success) {
      logger.info(
        `✅ [webhook] ${event} → ${hook.id} (${response.status}, ${duration}ms)`
      );

      await db('webhooks').where({ id: hook.id }).update({
        successCount: db.raw('"successCount" + 1'),
        lastTriggeredAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
      });

      // Nettoyer : garder seulement les N dernières livraisons
      await cleanupDeliveries(hook.id);
      return;
    }

    // Échec → log
    logger.warn(
      `⚠️ [webhook] ${event} → ${hook.id} a échoué (HTTP ${response.status}, tentative ${attempt})`
    );

    await db('webhooks').where({ id: hook.id }).update({
      lastTriggeredAt: new Date().toISOString(),
      lastFailureAt: new Date().toISOString(),
    });

    // Retry si possible
    if (attempt < RETRY_DELAYS.length + 1) {
      const delay = RETRY_DELAYS[attempt - 1];
      logger.info(
        `🔁 [webhook] Retry ${hook.id} dans ${delay / 1000}s (tentative ${attempt + 1})`
      );
      setTimeout(() => {
        deliverWebhook(hook, event, payload, attempt + 1).catch((err) =>
          logger.error(`❌ [webhook] Retry ${hook.id} erreur: ${err.message}`)
        );
      }, delay);
    } else {
      await db('webhooks').where({ id: hook.id }).update({
        failureCount: db.raw('"failureCount" + 1'),
      });
      logger.error(
        `❌ [webhook] ${hook.id} : échec définitif après ${attempt} tentatives`
      );
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'Timeout (15s)' : err.message;

    logger.warn(
      `⚠️ [webhook] ${hook.id} erreur réseau: ${errorMsg} (tentative ${attempt})`
    );

    // Log
    await db('webhook_deliveries').insert({
      id: deliveryId,
      webhookId: hook.id,
      event,
      statusCode: null,
      success: false,
      attempt,
      durationMs: duration,
      errorMessage: errorMsg,
      payload: body.length > MAX_PAYLOAD_STORED
        ? body.substring(0, MAX_PAYLOAD_STORED) + '...[truncated]'
        : body,
      createdAt: new Date().toISOString(),
    }).catch(() => {});

    await db('webhooks').where({ id: hook.id }).update({
      lastTriggeredAt: new Date().toISOString(),
      lastFailureAt: new Date().toISOString(),
    }).catch(() => {});

    // Retry
    if (attempt < RETRY_DELAYS.length + 1) {
      const delay = RETRY_DELAYS[attempt - 1];
      setTimeout(() => {
        deliverWebhook(hook, event, payload, attempt + 1).catch(() => {});
      }, delay);
    } else {
      await db('webhooks').where({ id: hook.id }).update({
        failureCount: db.raw('"failureCount" + 1'),
      }).catch(() => {});
    }
  }
};

// ============================================================
// Nettoyer les vieilles livraisons
// ============================================================
const cleanupDeliveries = async (webhookId: string): Promise<void> => {
  try {
    const keep = await db('webhook_deliveries')
      .where({ webhookId })
      .orderBy('createdAt', 'desc')
      .limit(MAX_DELIVERIES_KEPT)
      .select('id');

    const keepIds = keep.map((r: any) => r.id);
    if (keepIds.length === 0) return;

    await db('webhook_deliveries')
      .where({ webhookId })
      .whereNotIn('id', keepIds)
      .delete();
  } catch (err: any) {
    logger.warn(`⚠️ [webhook] cleanup deliveries: ${err.message}`);
  }
};

// ============================================================
// ✅ FONCTION PUBLIQUE : déclencher un événement
// ============================================================
export const triggerWebhookEvent = async (
  event: WebhookEvent,
  payload: any,
  projectId: string | null = null
): Promise<void> => {
  try {
    const hooks = await findWebhooksForEvent(event, projectId);
    if (hooks.length === 0) return;

    logger.info(`📤 [webhook] Event "${event}" → ${hooks.length} webhook(s)`);

    // Envoyer en parallèle (non bloquant)
    await Promise.all(
      hooks.map((hook) =>
        deliverWebhook(hook, event, payload, 1).catch((err) =>
          logger.warn(`⚠️ [webhook] delivery error ${hook.id}: ${err.message}`)
        )
      )
    );
  } catch (err: any) {
    logger.warn(`⚠️ [webhook] trigger error: ${err.message}`);
  }
};

// ============================================================
// ✅ FONCTION DE TEST (envoi immédiat, sans retry)
// ============================================================
export const testWebhook = async (hook: any): Promise<{
  success: boolean;
  statusCode?: number;
  durationMs: number;
  error?: string;
}> => {
  const body = JSON.stringify({
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test from Ebeno Research Platform' },
  });

  const signature = signPayload(body, hook.secret);
  const startTime = Date.now();

  try {
  const check = validateWebhookUrl(hook.url);
if (!check.valid) {
  logger.warn(`🚫 [webhook] URL bloquée: ${hook.url} (${check.reason})`);
  return; // ou return { success: false, ... } pour testWebhook
}
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT);

    const response = await fetch(hook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ebeno-Research-Webhook/1.0',
        'X-Ebeno-Event': 'webhook.test',
        'X-Ebeno-Signature': `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      durationMs: duration,
      error: response.status >= 200 && response.status < 300
        ? undefined
        : `HTTP ${response.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      durationMs: Date.now() - startTime,
      error: err.name === 'AbortError' ? 'Timeout (15s)' : err.message,
    };
  }
};
export default {
  WEBHOOK_EVENTS,
  generateSecret,
  signPayload,
  verifySignature,
  validateWebhookUrl,   // ✅ AJOUT
  triggerWebhookEvent,
  testWebhook,
};
