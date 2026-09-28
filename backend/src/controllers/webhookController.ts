// backend/src/controllers/webhookController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import {
  generateSecret,
  testWebhook,
  WEBHOOK_EVENTS,
} from '../services/webhookService';
import { logAuditFromReq } from '../services/auditLogService';
import { validateWebhookUrl } from '../services/webhookService';

const generateId = (): string =>
  `wh-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ============================================================
// ✅ Valider une URL
// ============================================================

// ============================================================
// ✅ LISTER les webhooks de l'utilisateur
// ============================================================
export const listWebhooks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const hooks = await db('webhooks')
      .where({ userId })
      .orderBy('createdAt', 'desc');

    const parsed = hooks.map((h: any) => ({
      ...h,
      events: JSON.parse(h.events || '[]'),
    }));

    res.json({ success: true, webhooks: parsed });
  } catch (err: any) {
    logger.error(`❌ [webhook] list: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ CRÉER un webhook
// ============================================================
export const createWebhook = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { name, url, events, projectId } = req.body;

    // ✅ Valider l'URL APRÈS avoir récupéré url
    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }
    const check = validateWebhookUrl(url);
    if (!check.valid) {
      return res.status(400).json({ error: `URL invalide: ${check.reason}` });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nom requis (2 caractères min)' });
    }
  
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'Au moins un événement requis' });
    }

    // Valider les events
    const invalidEvents = events.filter((e: string) => !WEBHOOK_EVENTS.includes(e as any));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: `Événements invalides: ${invalidEvents.join(', ')}`,
      });
    }

    // Vérifier le projet si fourni
    if (projectId) {
      const member = await db('project_members').where({ projectId, userId }).first();
      if (!member) {
        return res.status(403).json({ error: 'Accès non autorisé à ce projet' });
      }
    }

    const id = generateId();
    const secret = generateSecret();
    const now = new Date().toISOString();

    await db('webhooks').insert({
      id,
      userId,
      projectId: projectId || null,
      name: name.trim(),
      url: url.trim(),
      secret,
      events: JSON.stringify(events),
      active: true,
      successCount: 0,
      failureCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db('webhooks').where({ id }).first();

    await logAuditFromReq(req, {
      userId,
      action: 'webhook_created',
      targetType: 'webhook',
      targetId: id,
      targetName: name.trim(),
      status: 'success',
      metadata: { events, projectId: projectId || null },
    });

    res.status(201).json({
      success: true,
      webhook: { ...created, events: JSON.parse(created.events) },
    });
  } catch (err: any) {
    logger.error(`❌ [webhook] create: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ METTRE À JOUR
// ============================================================
export const updateWebhook = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const existing = await db('webhooks').where({ id, userId }).first();
    if (!existing) return res.status(404).json({ error: 'Webhook non trouvé' });

    const { name, url, events, active } = req.body;
    const updates: any = { updatedAt: new Date().toISOString() };

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({ error: 'Nom trop court' });
      }
      updates.name = name.trim();
    }
    if (url !== undefined) {
  const urlCheck = validateWebhookUrl(url);
  if (!urlCheck.valid) {
    return res.status(400).json({ error: `URL invalide: ${urlCheck.reason}` });
  }
  updates.url = url.trim();
}
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'Au moins un événement requis' });
      }
      updates.events = JSON.stringify(events);
    }
    if (active !== undefined) updates.active = !!active;

    await db('webhooks').where({ id, userId }).update(updates);
    const updated = await db('webhooks').where({ id }).first();

    res.json({
      success: true,
      webhook: { ...updated, events: JSON.parse(updated.events) },
    });
  } catch (err: any) {
    logger.error(`❌ [webhook] update: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ SUPPRIMER
// ============================================================
export const deleteWebhook = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const hook = await db('webhooks').where({ id, userId }).first();
    if (!hook) return res.status(404).json({ error: 'Webhook non trouvé' });

    await db('webhook_deliveries').where({ webhookId: id }).delete();
    await db('webhooks').where({ id, userId }).delete();

    await logAuditFromReq(req, {
      userId,
      action: 'webhook_deleted',
      targetType: 'webhook',
      targetId: id,
      targetName: hook.name,
      status: 'success',
    });

    res.json({ success: true, message: 'Webhook supprimé' });
  } catch (err: any) {
    logger.error(`❌ [webhook] delete: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ TESTER
// ============================================================
export const testWebhookHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const hook = await db('webhooks').where({ id, userId }).first();
    if (!hook) return res.status(404).json({ error: 'Webhook non trouvé' });

    const result = await testWebhook(hook);

    if (result.success) {
      await db('webhooks').where({ id }).update({
        successCount: db.raw('"successCount" + 1'),
        lastTriggeredAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
      });
    } else {
      await db('webhooks').where({ id }).update({
        failureCount: db.raw('"failureCount" + 1'),
        lastTriggeredAt: new Date().toISOString(),
        lastFailureAt: new Date().toISOString(),
      });
    }

    res.json({ success: true, result });
  } catch (err: any) {
    logger.error(`❌ [webhook] test: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ LISTER LES LIVRAISONS
// ============================================================
export const listDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const hook = await db('webhooks').where({ id, userId }).first();
    if (!hook) return res.status(404).json({ error: 'Webhook non trouvé' });

    const deliveries = await db('webhook_deliveries')
      .where({ webhookId: id })
      .orderBy('createdAt', 'desc')
      .limit(20);

    res.json({ success: true, deliveries });
  } catch (err: any) {
    logger.error(`❌ [webhook] deliveries: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ LISTER LES ÉVÉNEMENTS DISPONIBLES
// ============================================================
export const listEvents = async (_req: Request, res: Response) => {
  res.json({ success: true, events: WEBHOOK_EVENTS });
};
