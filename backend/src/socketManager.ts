// backend/src/socketManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';
import { sendPushToProjectMembers } from './services/pushService';

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
export const emitGlobal = (event: string, data: any): void => {
  if (!io) {
    logger.warn('⚠️ [socketManager] IO non initialisé, emitGlobal ignoré');
    return;
  }

  // ✅ Si un projectId est présent → router au room du projet uniquement
  if (data?.projectId) {
    io.to(`project:${data.projectId}`).emit(event, data);

    // ✅ Envoyer aussi un push navigateur en parallèle (non bloquant)
    sendPushToProjectMembers(data.projectId, event, data).catch((err) =>
      logger.warn(`⚠️ [push] Erreur envoi push: ${err.message}`)
    );

    return;
  }

  // Sinon broadcast global (fallback)
  io.emit(event, data);
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
