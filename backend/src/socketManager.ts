// backend/src/socketManager.ts
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const setIO = (server: SocketIOServer) => {
  io = server;
  console.log('✅ [socketManager] Instance IO enregistrée');
};

export const getIO = (): SocketIOServer | null => io;

/**
 * Émet un événement à tous les clients connectés
 * Le client filtrera par projectId dans le payload
 */
export const emitGlobal = (event: string, data: any) => {
  if (!io) {
    console.warn('⚠️ [socketManager] IO non initialisé, événement ignoré');
    return;
  }
  io.emit(event, data);
  console.log(`📡 [socket] ${event} → ${JSON.stringify(data).substring(0, 100)}...`);
};
