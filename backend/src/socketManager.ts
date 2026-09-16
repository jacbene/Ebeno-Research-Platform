// backend/src/socketManager.ts
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './utils/logger';

let io: SocketIOServer | null = null;

export const setIO = (server: SocketIOServer): void => {
  io = server;
  logger.info('✅ [socketManager] Instance IO enregistrée');
};

export const getIO = (): SocketIOServer | null => io;

/**
 * Broadcast global à tous les sockets connectés.
 * ⚠️ À utiliser avec parcimonie — préférer emitToProject / emitToDocument.
 */
export const emitGlobal = (event: string, data: any): void => {
  if (!io) {
    logger.warn('⚠️ [socketManager] IO non initialisé, emitGlobal ignoré');
    return;
  }
  io.emit(event, data);
};

/**
 * ✅ Émet à tous les utilisateurs d'un projet.
 */
export const emitToProject = (
  projectId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

/**
 * ✅ Émet à un projet en excluant un socket (typiquement l'émetteur).
 */
export const emitToProjectExcept = (
  projectId: string,
  exceptSocketId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`project:${projectId}`).except(exceptSocketId).emit(event, data);
};

/**
 * ✅ Émet à tous les utilisateurs d'un document collaboratif.
 */
export const emitToDocument = (
  documentId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`doc:${documentId}`).emit(event, data);
};

/**
 * ✅ Émet à un document en excluant un socket.
 */
export const emitToDocumentExcept = (
  documentId: string,
  exceptSocketId: string,
  event: string,
  data: any
): void => {
  if (!io) return;
  io.to(`doc:${documentId}`).except(exceptSocketId).emit(event, data);
};
