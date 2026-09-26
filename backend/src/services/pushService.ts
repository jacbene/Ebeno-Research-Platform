// backend/src/services/pushService.ts
// ✅ Notifications push navigateur (Web Push API + VAPID)

import webpush from 'web-push';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ebeno.com';

const configured = !!(VAPID_PUBLIC && VAPID_PRIVATE);

if (configured) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    logger.info('✅ [push] Service Web Push initialisé (VAPID)');
  } catch (err: any) {
    logger.error(`❌ [push] Erreur config VAPID: ${err.message}`);
  }
} else {
  logger.warn('⚠️ [push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY non configurées — push désactivé');
}

export const isPushConfigured = (): boolean => configured;

// ============================================================
// Throttle anti-spam : 1 push max / 30s par user
// ============================================================
const THROTTLE_MS = 30_000;
const lastPushAt = new Map<string, number>();

const canSendPush = (userId: string): boolean => {
  const now = Date.now();
  const last = lastPushAt.get(userId) || 0;
  if (now - last < THROTTLE_MS) return false;
  lastPushAt.set(userId, now);
  return true;
};

// ============================================================
// i18n des payloads push (5 langues)
// ============================================================
type Lang = 'fr' | 'en' | 'es' | 'pt' | 'ar';
const SUPPORTED_LANGS: Lang[] = ['fr', 'en', 'es', 'pt', 'ar'];

const normalizeLang = (l?: string): Lang => {
  const code = (l || 'fr').split('-')[0].toLowerCase();
  return (SUPPORTED_LANGS.includes(code as Lang) ? code : 'fr') as Lang;
};

interface PushStrings {
  memberAdded: (name: string, project: string) => string;
  memberRemoved: (project: string) => string;
  transcriptionUploaded: (title: string) => string;
  documentCreated: (title: string) => string;
  documentRenamed: (title: string) => string;
  memoCreated: (title: string) => string;
  commentCreated: (name: string) => string;
  summaryReady: (title: string) => string;
  fileUploaded: (name: string) => string;
}

const PUSH_STRINGS: Record<Lang, PushStrings> = {
  fr: {
    memberAdded: (n, p) => `${n} vous a ajouté au projet "${p}"`,
    memberRemoved: (p) => `Vous avez été retiré du projet "${p}"`,
    transcriptionUploaded: (t) => `Nouvelle transcription : ${t}`,
    documentCreated: (t) => `Nouveau document : ${t}`,
    documentRenamed: (t) => `Document renommé : ${t}`,
    memoCreated: (t) => `Nouveau memo : ${t}`,
    commentCreated: (n) => `${n} a commenté un document`,
    summaryReady: (t) => `Résumé IA prêt : ${t}`,
    fileUploaded: (n) => `Fichier ajouté : ${n}`,
  },
  en: {
    memberAdded: (n, p) => `${n} added you to project "${p}"`,
    memberRemoved: (p) => `You were removed from project "${p}"`,
    transcriptionUploaded: (t) => `New transcription: ${t}`,
    documentCreated: (t) => `New document: ${t}`,
    documentRenamed: (t) => `Document renamed: ${t}`,
    memoCreated: (t) => `New memo: ${t}`,
    commentCreated: (n) => `${n} commented on a document`,
    summaryReady: (t) => `AI summary ready: ${t}`,
    fileUploaded: (n) => `File added: ${n}`,
  },
  es: {
    memberAdded: (n, p) => `${n} te añadió al proyecto "${p}"`,
    memberRemoved: (p) => `Has sido eliminado del proyecto "${p}"`,
    transcriptionUploaded: (t) => `Nueva transcripción: ${t}`,
    documentCreated: (t) => `Nuevo documento: ${t}`,
    documentRenamed: (t) => `Documento renombrado: ${t}`,
    memoCreated: (t) => `Nuevo memo: ${t}`,
    commentCreated: (n) => `${n} comentó un documento`,
    summaryReady: (t) => `Resumen IA listo: ${t}`,
    fileUploaded: (n) => `Archivo añadido: ${n}`,
  },
  pt: {
    memberAdded: (n, p) => `${n} adicionou-o ao projeto "${p}"`,
    memberRemoved: (p) => `Foi removido do projeto "${p}"`,
    transcriptionUploaded: (t) => `Nova transcrição: ${t}`,
    documentCreated: (t) => `Novo documento: ${t}`,
    documentRenamed: (t) => `Documento renomeado: ${t}`,
    memoCreated: (t) => `Novo memo: ${t}`,
    commentCreated: (n) => `${n} comentou um documento`,
    summaryReady: (t) => `Resumo IA pronto: ${t}`,
    fileUploaded: (n) => `Ficheiro adicionado: ${n}`,
  },
  ar: {
    memberAdded: (n, p) => `أضافك ${n} إلى المشروع "${p}"`,
    memberRemoved: (p) => `تمت إزالتك من المشروع "${p}"`,
    transcriptionUploaded: (t) => `نسخة جديدة: ${t}`,
    documentCreated: (t) => `مستند جديد: ${t}`,
    documentRenamed: (t) => `تمت إعادة تسمية المستند: ${t}`,
    memoCreated: (t) => `مذكرة جديدة: ${t}`,
    commentCreated: (n) => `علّق ${n} على مستند`,
    summaryReady: (t) => `ملخص الذكاء الاصطناعي جاهز: ${t}`,
    fileUploaded: (n) => `تمت إضافة الملف: ${n}`,
  },
};

// ============================================================
// Mapping event → préférence
// ============================================================
type PreferenceKey = 'notifyProjectMemberAdded' | 'notifyTranscriptionComplete' | 'notifySummaryReady';

const EVENT_PREFERENCE: Record<string, PreferenceKey> = {
  'member-added': 'notifyProjectMemberAdded',
  'member-removed': 'notifyProjectMemberAdded',
  'document-created': 'notifyProjectMemberAdded',
  'document-updated-title': 'notifyProjectMemberAdded',
  'memo-created': 'notifyProjectMemberAdded',
  'comment-created': 'notifyProjectMemberAdded',
  'file-uploaded': 'notifyProjectMemberAdded',
  'transcription-uploaded': 'notifyTranscriptionComplete',
  'summary-ready': 'notifySummaryReady',
};

// ============================================================
// Construire le payload push
// ============================================================
const buildPushPayload = (
  event: string,
  data: any,
  lang: Lang
): { title: string; body: string; url: string } | null => {
  const S = PUSH_STRINGS[lang];
  const actorName = data?.actorName || 'Quelqu\'un';

  switch (event) {
    case 'member-added':
      return {
        title: `👥 ${S.memberAdded(actorName, data?.projectTitle || 'Projet')}`,
        body: '',
        url: `/project/${data?.projectId || ''}`,
      };
    case 'member-removed':
      return {
        title: `👥 ${S.memberRemoved(data?.projectTitle || 'Projet')}`,
        body: '',
        url: '/',
      };
    case 'transcription-uploaded':
      return {
        title: `🎙️ ${S.transcriptionUploaded(data?.title || 'Audio')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'document-created':
      return {
        title: `📝 ${S.documentCreated(data?.document?.title || data?.title || 'Sans titre')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'document-updated-title':
      return {
        title: `✏️ ${S.documentRenamed(data?.newTitle || 'Sans titre')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'memo-created':
      return {
        title: `📝 ${S.memoCreated(data?.title || data?.memo?.title || 'Sans titre')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'comment-created':
      return {
        title: `💬 ${S.commentCreated(actorName)}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'file-uploaded':
      return {
        title: `📎 ${S.fileUploaded(data?.file?.fileName || data?.fileName || 'Fichier')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    case 'summary-ready':
      return {
        title: `📊 ${S.summaryReady(data?.title || 'Document')}`,
        body: '',
        url: data?.projectId ? `/project/${data.projectId}` : '/',
      };
    default:
      return null;
  }
};

// ============================================================
// ✅ ENVOYER UN PUSH À UN UTILISATEUR (toutes ses subscriptions)
// ============================================================
export const sendPushToUser = async (
  userId: string,
  payload: { title: string; body?: string; url?: string; tag?: string },
  respectThrottle: boolean = true
): Promise<boolean> => {
  if (!configured) return false;

  if (respectThrottle && !canSendPush(userId)) {
    logger.info(`⏭️ [push] ${userId} throttled (30s)`);
    return false;
  }

  const subs = await db('push_subscriptions').where({ userId });
  if (subs.length === 0) return false;

  const pushBody = JSON.stringify({
    title: payload.title,
    body: payload.body || '',
    url: payload.url || '/',
    tag: payload.tag || 'ebeno-notification',
    timestamp: Date.now(),
  });

  let sent = 0;
  const toDelete: string[] = [];

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody
      );
      sent++;
      await db('push_subscriptions')
        .where({ id: sub.id })
        .update({ lastUsedAt: new Date().toISOString() });
    } catch (err: any) {
      // 410 = subscription expirée/annulée par le navigateur
      if (err.statusCode === 410 || err.statusCode === 404) {
        toDelete.push(sub.id);
      } else {
        logger.warn(`⚠️ [push] Erreur envoi ${sub.id}: ${err.message}`);
      }
    }
  }

  // Nettoyer les subscriptions mortes
  if (toDelete.length > 0) {
    await db('push_subscriptions').whereIn('id', toDelete).delete();
    logger.info(`🧹 [push] ${toDelete.length} subscription(s) expirée(s) supprimée(s)`);
  }

  return sent > 0;
};

// ============================================================
// ✅ ENVOYER UN PUSH À TOUS LES MEMBRES D'UN PROJET
//    (sauf l'acteur)
// ============================================================
export const sendPushToProjectMembers = async (
  projectId: string,
  event: string,
  data: any
): Promise<void> => {
  if (!configured) return;

  const prefKey = EVENT_PREFERENCE[event];
  if (!prefKey) {
    // Pas d'événement notifiable par push
    return;
  }

  // Récupérer les membres du projet (sauf l'acteur)
  let memberQuery = db('project_members')
    .join('users', 'project_members.userId', 'users.id')
    .where('project_members.projectId', projectId)
    .select(
      'users.id as userId',
      'users.name',
      'users.language',
      prefKey
    );

  if (data?.actorId) {
    memberQuery = memberQuery.whereNot('users.id', data.actorId);
  }

  const members = await memberQuery;

  if (members.length === 0) return;

  logger.info(
    `📤 [push] Envoi "${event}" à ${members.length} membre(s) du projet ${projectId}`
  );

  // Envoi en parallèle
  await Promise.all(
    members.map(async (m: any) => {
      // Vérifier la préférence
      const prefEnabled = m[prefKey] !== false;
      if (!prefEnabled) {
        logger.info(`⏭️ [push] ${m.userId} a désactivé ${prefKey}`);
        return;
      }

      const lang = normalizeLang(m.language);
      const payload = buildPushPayload(event, data, lang);
      if (!payload) return;

      try {
        await sendPushToUser(m.userId, payload, true);
      } catch (err: any) {
        logger.warn(`⚠️ [push] Erreur pour ${m.userId}: ${err.message}`);
      }
    })
  );
};

// ============================================================
// ✅ SUBSCRIBE / UNSUBSCRIBE
// ============================================================
export const saveSubscription = async (
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent?: string
): Promise<void> => {
  const { endpoint, keys } = subscription;

  const existing = await db('push_subscriptions').where({ endpoint }).first();

  if (existing) {
    // Mettre à jour si déjà enregistrée pour un autre user
    await db('push_subscriptions')
      .where({ endpoint })
      .update({
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent || existing.userAgent,
        lastUsedAt: new Date().toISOString(),
      });
  } else {
    const id = `ps-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    await db('push_subscriptions').insert({
      id,
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    });
  }

  logger.info(`✅ [push] Subscription enregistrée pour ${userId}`);
};

export const removeSubscription = async (endpoint: string): Promise<void> => {
  await db('push_subscriptions').where({ endpoint }).delete();
  logger.info(`✅ [push] Subscription supprimée`);
};

export const getVapidPublicKey = (): string => VAPID_PUBLIC;

export default {
  sendPushToUser,
  sendPushToProjectMembers,
  saveSubscription,
  removeSubscription,
  getVapidPublicKey,
  isPushConfigured,
};
