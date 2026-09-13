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

interface JoinDocPayload {
  documentId: string;
  userId: string;
  userName: string;
  color?: string;
}

interface EditDocPayload {
  documentId: string;
  content: string;
  cursorPosition?: number;
}

interface TypingPayload {
  projectId?: string;
  documentId?: string;
  context: string;
  isTyping: boolean;
}

export class CollaborationSocketHandler {
  private io: SocketIOServer;
  private userSockets = new Map<string, { userId: string; userName: string; projectId: string; color: string }>();
  // Map : documentId → { [socketId]: { userId, userName, color } }
  private documentUsers = new Map<string, Map<string, { userId: string; userName: string; color: string }>>();

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

          socket.rooms.forEach((room) => {
            if (room !== socket.id) socket.leave(room);
          });
          socket.join(`project:${projectId}`);

          const userInfo = addUser(projectId, socket.id, {
            userId,
            userName: userName || 'Utilisateur',
            userEmail,
          });

          this.userSockets.set(socket.id, { userId, userName, projectId, color: userInfo.color });

          socket.emit('presence-color', { color: userInfo.color });
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

      // ---------- Rejoindre un document (édition collaborative) ----------
      socket.on('join-document', async (payload: JoinDocPayload) => {
        try {
          const { documentId, userId, userName, color } = payload;
          if (!documentId) return;

          socket.join(`doc:${documentId}`);

          // Ajouter l'utilisateur à la liste du document
          if (!this.documentUsers.has(documentId)) {
            this.documentUsers.set(documentId, new Map());
          }
          const userInfo = this.userSockets.get(socket.id);
          const userColor = color || userInfo?.color || '#4ECDC4';

          this.documentUsers.get(documentId)!.set(socket.id, {
            userId,
            userName,
            color: userColor,
          });

          // Récupérer le document en base
          const doc = await db('collaboration_documents').where({ id: documentId }).first();

          // Envoyer le contenu actuel + liste des utilisateurs
          socket.emit('document-content', {
            document: doc
              ? {
                  id: doc.id,
                  title: doc.title,
                  content: doc.content || '',
                  version: doc.version || 1,
                  updatedAt: doc.updatedAt,
                }
              : { id: documentId, title: 'Document', content: '', version: 1 },
            users: Array.from(this.documentUsers.get(documentId)!.values()),
          });

          // Notifier les autres utilisateurs
          socket.to(`doc:${documentId}`).emit('user-joined', {
            userId,
            name: userName,
            color: userColor,
          });

          logger.info(`📄 [socket] ${userName} a rejoint le document ${documentId}`);
        } catch (error: any) {
          logger.error('❌ [socket] join-document:', error);
        }
      });

      // ---------- Quitter un document ----------
      socket.on('leave-document', (payload: { documentId: string }) => {
        const { documentId } = payload;
        socket.leave(`doc:${documentId}`);

        const docUsers = this.documentUsers.get(documentId);
        if (docUsers) {
          const user = docUsers.get(socket.id);
          docUsers.delete(socket.id);
          if (docUsers.size === 0) this.documentUsers.delete(documentId);

          if (user) {
            socket.to(`doc:${documentId}`).emit('user-left', { userId: user.userId });
          }
        }
      });

      // ---------- Édition d'un document ----------
      socket.on('edit-document', async (payload: EditDocPayload) => {
        try {
          const { documentId, content, cursorPosition } = payload;
          const user = this.userSockets.get(socket.id);
          if (!user || !documentId) return;

          // Diffuser aux autres utilisateurs du document
          socket.to(`doc:${documentId}`).emit('document-updated', {
            content,
            userId: user.userId,
            userName: user.userName,
            version: Date.now(),
          });

          // Diffuser la position du curseur
          if (cursorPosition !== undefined) {
            socket.to(`doc:${documentId}`).emit('cursor-moved', {
              userId: user.userId,
              userName: user.userName,
              position: cursorPosition,
              documentId,
              socketId: socket.id,
            });
          }

          // Sauvegarder dans la base (debounce côté client)
          await db('collaboration_documents')
            .where({ id: documentId })
            .update({
              content,
              version: db.raw('version + 1'),
              updatedAt: new Date().toISOString(),
            });
        } catch (error: any) {
          logger.error('❌ [socket] edit-document:', error);
        }
      });

      // ---------- Ping de présence ----------
      socket.on('presence-ping', (payload: { projectId: string }) => {
        updatePresence(payload.projectId, socket.id);
      });

      // ---------- Indicateur de frappe ----------
      socket.on('typing', (payload: TypingPayload) => {
        const { projectId, documentId, context, isTyping } = payload;
        const user = this.userSockets.get(socket.id);
        if (!user) return;

        const target = documentId ? `doc:${documentId}` : `project:${projectId}`;
        socket.to(target).emit('user-typing', {
          userId: user.userId,
          userName: user.userName,
          context,
          isTyping,
        });
      });

      // ---------- Demander la présence actuelle ----------
      socket.on('get-presence', (payload: { projectId: string }) => {
        socket.emit('presence-update', {
          users: getUniqueProjectUsers(payload.projectId),
        });
      });

      // ---------- Déconnexion ----------
      socket.on('disconnect', () => {
        const user = this.userSockets.get(socket.id);
        if (user) {
          removeUser(user.projectId, socket.id);
          this.broadcastPresence(user.projectId);
          this.userSockets.delete(socket.id);
          logger.info(`👋 [socket] Déconnexion : ${socket.id} (${user.userName})`);
        }

        // Nettoyer les documents
        this.documentUsers.forEach((users, docId) => {
          if (users.has(socket.id)) {
            const docUser = users.get(socket.id)!;
            users.delete(socket.id);
            if (users.size === 0) this.documentUsers.delete(docId);
            this.io.to(`doc:${docId}`).emit('user-left', { userId: docUser.userId });
          }
        });
      });
    });

    setInterval(() => {
      this.io.emit('server-ping', { timestamp: Date.now() });
    }, 30000);
  }

  private async broadcastPresence(projectId: string) {
    try {
      const users = getUniqueProjectUsers(projectId);
      this.io.to(`project:${projectId}`).emit('presence-update', { users });
    } catch (error: any) {
      logger.error('❌ [socket] broadcastPresence:', error);
    }
  }
}
