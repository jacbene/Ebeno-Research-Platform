// backend/src/sockets/collaborationSocket.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import {
  addUser,
  removeUser,
  updatePresence,
  getUniqueProjectUsers,
} from '../services/presenceService';
import { db } from '../db/knex';

interface JoinPayload {
  projectId: string;
  userId: string;
  userName: string;
  userEmail?: string;
}

interface TypingPayload {
  projectId: string;
  context: string; // ex: 'memo', 'document', etc.
  isTyping: boolean;
}

export class CollaborationSocketHandler {
  private io: SocketIOServer;
  private userSockets = new Map<string, { userId: string; userName: string; projectId: string }>();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHandlers();
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`🔌 [socket] Connexion : ${socket.id}`);

      // ---------- Rejoindre un projet ----------
      socket.on('join-project', async (payload: JoinPayload) => {
        try {
          const { projectId, userId, userName, userEmail } = payload;
          if (!projectId || !userId) return;

          // Quitter les autres rooms
          socket.rooms.forEach((room) => {
            if (room !== socket.id) socket.leave(room);
          });

          socket.join(`project:${projectId}`);

          const userInfo = addUser(projectId, socket.id, {
            userId,
            userName: userName || 'Utilisateur',
            userEmail,
          });

          this.userSockets.set(socket.id, { userId, userName, projectId });

          // Envoyer la couleur au nouvel arrivant
          socket.emit('presence-color', { color: userInfo.color });

          // Notifier les autres utilisateurs
          this.broadcastPresence(projectId);

          logger.info(`✅ [socket] ${userName} → projet ${projectId}`);
        } catch (error: any) {
          logger.error('❌ [socket] join-project:', error);
        }
      });

      // ---------- Quitter un projet ----------
      socket.on('leave-project', (payload: { projectId: string }) => {
        const { projectId } = payload;
        socket.leave(`project:${projectId}`);
        removeUser(projectId, socket.id);
        this.userSockets.delete(socket.id);
        this.broadcastPresence(projectId);
      });

      // ---------- Ping de présence ----------
      socket.on('presence-ping', (payload: { projectId: string }) => {
        const { projectId } = payload;
        updatePresence(projectId, socket.id);
      });

      // ---------- Indicateur de frappe ----------
      socket.on('typing', (payload: TypingPayload) => {
        const { projectId, context, isTyping } = payload;
        const user = this.userSockets.get(socket.id);
        if (!user) return;

        socket.to(`project:${projectId}`).emit('user-typing', {
          userId: user.userId,
          userName: user.userName,
          context,
          isTyping,
        });
      });

      // ---------- Curseur (position dans un document) ----------
      socket.on('cursor-move', (payload: { projectId: string; documentId: string; position: number }) => {
        const { projectId, documentId, position } = payload;
        const user = this.userSockets.get(socket.id);
        if (!user) return;

        socket.to(`project:${projectId}`).emit('cursor-moved', {
          userId: user.userId,
          userName: user.userName,
          documentId,
          position,
          socketId: socket.id,
        });
      });

      // ---------- Demander la présence actuelle ----------
      socket.on('get-presence', (payload: { projectId: string }) => {
        const users = getUniqueProjectUsers(payload.projectId);
        socket.emit('presence-update', { users });
      });

      // ---------- Déconnexion ----------
      socket.on('disconnect', () => {
        const user = this.userSockets.get(socket.id);
        if (user) {
          removeUser(user.projectId, socket.id);
          this.broadcastPresence(user.projectId);
          this.userSockets.delete(socket.id);
          logger.info(`👋 [socket] Déconnexion : ${socket.id} (${user.userName})`);
        } else {
          logger.info(`👋 [socket] Déconnexion : ${socket.id}`);
        }
      });
    });

    // Ping automatique toutes les 30s pour nettoyer les sockets morts
    setInterval(() => {
      this.io.emit('server-ping', { timestamp: Date.now() });
    }, 30000);
  }

  /**
   * Diffuser la liste des utilisateurs uniques d'un projet à toute la room
   */
  private async broadcastPresence(projectId: string) {
    try {
      const users = getUniqueProjectUsers(projectId);
      this.io.to(`project:${projectId}`).emit('presence-update', { users });
    } catch (error: any) {
      logger.error('❌ [socket] broadcastPresence:', error);
    }
  }
}
