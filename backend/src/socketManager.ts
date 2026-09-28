// backend/src/socketManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { sendPushToProjectMembers } from './services/pushService';
import { triggerWebhookEvent, WebhookEvent } from './services/webhookService';

let io: SocketIOServer | null = null;

export const setIO = (server: SocketIOServer): void => {
  io = server;
  logger.info('✅ [socketManager] Instance IO enregistrée');
};

export const getIO = (): SocketIOServer | null => io;

// ============================================================
// ✅ Émission générique — route automatiquement vers le project room
//    si projectId est présent dans les données
// ============================================================
	// ✅ Mapping interne : event Socket.IO → event Webhook
const SOCKET_TO_WEBHOOK: Record<string, WebhookEvent> = {
  'member-added': 'member.added',
  'document-created': 'file.uploaded',
  'document-updated-title': 'file.edited',
  'memo-created': 'memo.created',
  'comment-created': 'comment.created',
  'file-uploaded': 'file.uploaded',
  'file-trashed': 'file.trashed',
  'file-edited': 'file.edited',
  'transcription-uploaded': 'transcription.uploaded',
  'transcription-completed': 'transcription.completed',
  'project-created': 'project.created',
  'project-updated': 'project.updated',
  'project-deleted': 'project.deleted',
};

export const emitGlobal = (event: string, data: any): void => {
  if (!io) {
    logger.warn('⚠️ [socketManager] IO non initialisé, emitGlobal ignoré');
    return;
  }

  // ✅ Si un projectId est présent → router au room du projet uniquement
  if (data?.projectId) {
    io.to(`project:${data.projectId}`).emit(event, data);

    // ✅ Push navigateur en parallèle
    sendPushToProjectMembers(data.projectId, event, data).catch((err) =>
      logger.warn(`⚠️ [push] Erreur envoi push: ${err.message}`)
    );

    // ✅ Webhook externe en parallèle
    const webhookEvent = SOCKET_TO_WEBHOOK[event];
    if (webhookEvent) {
      triggerWebhookEvent(webhookEvent, data, data.projectId).catch((err) =>
        logger.warn(`⚠️ [webhook] Erreur trigger: ${err.message}`)
      );
    }

    return;
  }

  // Sinon broadcast global (fallback)
  io.emit(event, data);

  // ✅ Webhooks globaux (sans projet)
  const webhookEvent = SOCKET_TO_WEBHOOK[event];
  if (webhookEvent) {
    triggerWebhookEvent(webhookEvent, data, null).catch((err) =>
      logger.warn(`⚠️ [webhook] Erreur trigger: ${err.message}`)
    );
  }
};

// ============================================================
// ✅ Émission ciblée projet (explicite)
// ============================================================
export const emitToProject = (
  projectId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

export const emitToProjectExcept = (
  projectId: string,
  exceptSocketId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`project:${projectId}`).except(exceptSocketId).emit(event, data);
};

// ============================================================
// ✅ Émission ciblée document (collaboration temps réel)
// ============================================================
export const emitToDocument = (
  documentId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`doc:${documentId}`).emit(event, data);
};

export const emitToDocumentExcept = (
  documentId: string,
  exceptSocketId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`doc:${documentId}`).except(exceptSocketId).emit(event, data);
};
