// backend/src/services/webhookService.ts
import crypto from 'crypto';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import ssrfAgentGuard from 'ssrf-agent-guard';
import axios from 'axios';

export const triggerWebhook = async (url: string, payload: any) => {
  try {
    const response = await axios.post(url, payload, {
     httpAgent: ssrfAgentGuard(url),
     httpsAgent: ssrfAgentGuard(url),
      maxRedirects: 0, // Ne pas suivre les redirections
      timeout: 5000, // 5 secondes max
    });
    return response.data;
  } catch (error) {
    // Gérer l'erreur (webhook bloqué ou échec réseau)
    throw error;
  }
};

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
// Remplace les fonctions attemptDelivery et testWebhook par celles-ci :

export const attemptDelivery = async (deliveryId: string, hook: any, event: string, payload: string, attempt: number): Promise<boolean> => {
  const signature = signPayload(payload, hook.secret);
  const startTime = Date.now();

  try {
    const check = validateWebhookUrl(hook.url);
    if (!check.valid) throw new Error(check.reason);

    // ✅ Utilisation d'Axios avec l'agent sécurisé au lieu de fetch
    const response = await axios.post(hook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ebeno-Research-Webhook/1.0',
        'X-Ebeno-Event': event,
        'X-Ebeno-Signature': `sha256=${signature}`,
        'X-Ebeno-Delivery': deliveryId,
        'X-Ebeno-Attempt': String(attempt),
      },
      httpAgent: ssrfAgentGuard(hook.url),
      httpsAgent: ssrfAgentGuard(hook.url),
      maxRedirects: 0, // ✅ Bloque les redirections malveillantes
      timeout: DELIVERY_TIMEOUT,
    });

    const duration = Date.now() - startTime;
    const success = response.status >= 200 && response.status < 300;

    if (success) {
      // ... (garde ton code de succès existant)
      return true;
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err: any) {
    // ... (garde ton code de gestion d'erreur existant)
    return false;
  }
};

export const testWebhook = async (hook: any) => {
  const body = JSON.stringify({
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    data: { message: 'Test from Ebeno Research Platform' },
  });

  const signature = signPayload(body, hook.secret);
  const startTime = Date.now();

  try {
    const check = validateWebhookUrl(hook.url);
    if (!check.valid) return { success: false, durationMs: 0, error: check.reason };

    const response = await axios.post(hook.url, body, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ebeno-Research-Webhook/1.0',
        'X-Ebeno-Event': 'webhook.test',
        'X-Ebeno-Signature': `sha256=${signature}`,
      },
      httpAgent: ssrfAgentGuard(hook.url),
      httpsAgent: ssrfAgentGuard(hook.url),
      maxRedirects: 0,
      timeout: DELIVERY_TIMEOUT,
    });

    return {
      success: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    return { success: false, durationMs: Date.now() - startTime, error: err.message };
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


export default { WEBHOOK_EVENTS, generateSecret, signPayload, validateWebhookUrl, triggerWebhookEvent, testWebhook };
