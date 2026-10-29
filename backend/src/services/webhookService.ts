// backend/src/services/webhookService.ts
import crypto from 'crypto';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

export const WEBHOOK_EVENTS = [
  'project.created', 'project.updated', 'project.deleted',
  'file.uploaded', 'file.trashed', 'file.edited',
  'transcription.uploaded', 'transcription.completed',
  'memo.created', 'comment.created', 'member.added',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// Backoff exponentiel : 1min, 5min, 30min, 2h, 6h
const RETRY_DELAYS_MS = [60000, 300000, 1800000, 7200000, 21600000];
const DELIVERY_TIMEOUT = 15000;
const MAX_PAYLOAD_STORED = 5000;
const MAX_DELIVERIES_KEPT = 20;

const isPrivateHostname = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(lower)) return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal')) return true;
  const match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const a = Number(match[1]), b = Number(match[2]);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }
  return false;
};

export const validateWebhookUrl = (url: string): { valid: boolean; reason?: string } => {
  try {
    const parsed = new URL(url);
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return { valid: false, reason: 'HTTPS requis' };
    if (!['http:', 'https:'].includes(parsed.protocol)) return { valid: false, reason: 'Protocole non supporté' };
    if (isPrivateHostname(parsed.hostname)) return { valid: false, reason: 'URL interne bloquée (SSRF)' };
    if (url.length > 1024) return { valid: false, reason: 'URL trop longue' };
    return { valid: true };
  } catch { return { valid: false, reason: 'URL invalide' }; }
};

export const generateSecret = (): string => crypto.randomBytes(32).toString('hex');
export const signPayload = (payload: string, secret: string): string => crypto.createHmac('sha256', secret).update(payload).digest('hex');

const findWebhooksForEvent = async (event: WebhookEvent, projectId: string | null): Promise<any[]> => {
  let query = db('webhooks').where({ active: true });
  if (projectId) {
    query = query.andWhere((builder) => { builder.whereNull('projectId').orWhere({ projectId }); });
  } else {
    query = query.whereNull('projectId');
  }
  const hooks = await query;
  return hooks.filter((h: any) => {
    try { return JSON.parse(h.events || '[]').includes(event); } catch { return false; }
  });
};

// ✅ NOUVELLE FONCTION D'ENVOI UNIQUE (utilisée par le worker et le trigger initial)
export const attemptDelivery = async (deliveryId: string, hook: any, event: string, payload: string, attempt: number): Promise<boolean> => {
  const signature = signPayload(payload, hook.secret);
  const startTime = Date.now();

  try {
    const check = validateWebhookUrl(hook.url);
    if (!check.valid) throw new Error(check.reason);

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
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    if (success) {
      await db('webhook_deliveries').where({ id: deliveryId }).update({
        statusCode: response.status, success: true, durationMs: duration, next_retry_at: null,
      });
      await db('webhooks').where({ id: hook.id }).update({
        successCount: db.raw('"successCount" + 1'), lastTriggeredAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString(),
      });
      logger.info(`✅ [webhook] ${event} → ${hook.id} (${response.status}, ${duration}ms)`);
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const errorMsg = err.name === 'AbortError' ? 'Timeout (15s)' : err.message;
    
    // Planifier le prochain retry
    const nextDelay = RETRY_DELAYS_MS[attempt - 1];
    const nextRetryAt = nextDelay ? new Date(Date.now() + nextDelay) : null;
    const isDead = !nextRetryAt;

    await db('webhook_deliveries').where({ id: deliveryId }).update({
      statusCode: null, success: false, durationMs: duration, errorMessage: errorMsg,
      attempt: attempt, next_retry_at: nextRetryAt, is_dead: isDead,
    });

    if (isDead) {
      await db('webhooks').where({ id: hook.id }).update({ failureCount: db.raw('"failureCount" + 1') });
      logger.error(`❌ [webhook] ${hook.id} : échec définitif après ${attempt} tentatives`);
    } else {
      logger.warn(`⚠️ [webhook] ${hook.id} : échec (HTTP ${err.message}), retry prévu à ${nextRetryAt?.toISOString()}`);
    }
    return false;
  }
};

export const triggerWebhookEvent = async (event: WebhookEvent, payload: any, projectId: string | null = null): Promise<void> => {
  try {
    const hooks = await findWebhooksForEvent(event, projectId);
    if (hooks.length === 0) return;

    const body = JSON.stringify({ event, timestamp: new Date().toISOString(), data: payload });

    await Promise.all(hooks.map(async (hook) => {
      const deliveryId = `wd-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      
      await db('webhook_deliveries').insert({
        id: deliveryId, webhookId: hook.id, event, success: false, attempt: 1,
        payload: body.length > MAX_PAYLOAD_STORED ? body.substring(0, MAX_PAYLOAD_STORED) + '...[truncated]' : body,
        createdAt: new Date().toISOString(),
      });

      await attemptDelivery(deliveryId, hook, event, body, 1);
      await cleanupDeliveries(hook.id);
    }));
  } catch (err: any) {
    logger.warn(`⚠️ [webhook] trigger error: ${err.message}`);
  }
};

const cleanupDeliveries = async (webhookId: string): Promise<void> => {
  try {
    const keep = await db('webhook_deliveries').where({ webhookId }).orderBy('createdAt', 'desc').limit(MAX_DELIVERIES_KEPT).select('id');
    const keepIds = keep.map((r: any) => r.id);
    if (keepIds.length === 0) return;
    await db('webhook_deliveries').where({ webhookId }).whereNotIn('id', keepIds).delete();
  } catch (err: any) { logger.warn(`⚠️ [webhook] cleanup: ${err.message}`); }
};

export const testWebhook = async (hook: any) => {
  // ... (garde ta fonction testWebhook existante intacte)
};
export default { WEBHOOK_EVENTS, generateSecret, signPayload, validateWebhookUrl, triggerWebhookEvent, testWebhook };
