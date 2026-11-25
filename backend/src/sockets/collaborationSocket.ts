// backend/src/sockets/collaborationSocket.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import {
  addUser,
  removeUser,
  updatePresence,
  getUniqueProjectUsers,
  startPresenceCleanup,
} from '../services/presenceService';
import { db } from '../db/knex';
import { requireSecret } from '../config/secrets';

const JWT_SECRET = requireSecret('JWT_SECRET');

// ⚠️ Le userId n'est plus requis dans les payloads clients
interface JoinPayload {
  projectId: string;
  userName: string;
}

interface JoinDocPayload {
  documentId: string;
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

interface PendingUpdate {
  content: string;
  timer: NodeJS.Timeout | null;
  lastQueuedAt: number;
}

/**
 * Extrait le userId depuis le token JWT passé dans handshake.auth.
 */
const extractUserIdFromToken = (token?: string): string | null => {
  if (!token) return null;
  try {
    const payload: any = jwt.verify(token, JWT_SECRET);
    return payload?.id || null;
  } catch {
    return null;
  }
};

export class CollaborationSocketHandler {
  private io: SocketIOServer;
  private userSockets = new Map<
    string,
    { userId: string; userName: string; projectId: string; color: string }
  >();
  private documentUsers = new Map<
    string,
    Map<string, { userId: string; userName: string; color: string }>
  >();

  private pendingUpdates = new Map<string, PendingUpdate>();
  private readonly DEBOUNCE_MS = 500;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupHandlers();
    this.startCleanup();
  }

  // ============================================================
  // ✅ AUTO-JOIN des rooms projets du user à la connexion
  // ============================================================
  private async autoJoinUserProjects(
    socket: Socket,
    userId: string
  ): Promise<void> {
    try {
      const rows = await db('project_members')
        .where({ userId })
        .select('projectId');

      const projectIds = rows.map((r: any) => r.projectId);
      for (const pid of projectIds) {
        socket.join(`project:${pid}`);
      }

      logger.info(
        `🔔 [socket] ${userId} auto-joint ${projectIds.length} projet(s) pour notifications`
      );
    } catch (err: any) {
      logger.warn(`⚠️ [socket] autoJoinUserProjects échoué: ${err.message}`);
    }
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      // ✅ 1. AUTHENTIFICATION STRICTE
      const token = socket.handshake?.auth?.token as string | undefined;
      const userIdFromToken = extractUserIdFromToken(token);

      if (!userIdFromToken) {
        logger.warn(`❌ [socket] Connexion rejetée (token invalide/absent) : ${socket.id}`);
        socket.disconnect(true); // Coupe la connexion immédiatement
        return;
      }

      logger.info(`🔌 [socket] Connexion authentifiée : ${socket.id} (User: ${userIdFromToken})`);

      // Auto-join sécurisé
      this.autoJoinUserProjects(socket, userIdFromToken).catch(() => {});

      // ---------- Rejoindre un projet ----------
      socket.on('join-project', async (payload: JoinPayload) => {
        try {
          const { projectId, userName } = payload;
          if (!projectId) return;

          // ✅ 2. VÉRIFICATION D'AUTORISATION (Le userId vient du token, pas du client)
          const isMember = await db('project_members')
            .where({ projectId, userId: userIdFromToken })
            .first();

          if (!isMember) {
            socket.emit('error', 'Accès non autorisé à ce projet');
            logger.warn(`🚫 [socket] ${userIdFromToken} a tenté de rejoindre le projet ${projectId} sans droits`);
            return;
          }

          socket.rooms.forEach((room) => {
            if (room !== socket.id) socket.leave(room);
          });
          socket.join(`project:${projectId}`);

          const userInfo = addUser(projectId, socket.id, {
            userId: userIdFromToken,
            userName: userName || 'Utilisateur',
          });

          this.userSockets.set(socket.id, {
            userId: userIdFromToken,
            userName: userName || 'Utilisateur',
            projectId,
            color: userInfo.color,
          });

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

      // ---------- Rejoindre un document ----------
      socket.on('join-document', async (payload: JoinDocPayload) => {
        try {
          const { documentId, userName, color } = payload;
          if (!documentId) return;

          // ✅ 3. VÉRIFICATION D'AUTORISATION (Appartenance au projet du document)
          const doc = await db('collaboration_documents')
            .join('project_members', 'collaboration_documents.projectId', 'project_members.projectId')
            .where('collaboration_documents.id', documentId)
            .andWhere('project_members.userId', userIdFromToken)
            .select('collaboration_documents.*')
            .first();

          if (!doc) {
            socket.emit('error', 'Accès non autorisé à ce document');
            logger.warn(`🚫 [socket] ${userIdFromToken} a tenté d'accéder au doc ${documentId} sans droits`);
            return;
          }

          socket.join(`doc:${documentId}`);

          if (!this.documentUsers.has(documentId)) {
            this.documentUsers.set(documentId, new Map());
          }

          const userInfo = this.userSockets.get(socket.id);
          const userColor = color || userInfo?.color || '#4ECDC4';

          this.documentUsers.get(documentId)!.set(socket.id, {
            userId: userIdFromToken,
            userName: userName || 'Utilisateur',
            color: userColor,
          });

          socket.emit('document-content', {
            document: {
              id: doc.id,
              title: doc.title,
              content: doc.content || '',
              version: doc.version || 1,
              updatedAt: doc.updatedAt,
            },
            users: Array.from(this.documentUsers.get(documentId)!.values()),
          });

          socket.to(`doc:${documentId}`).emit('user-joined', {
            userId: userIdFromToken,
            name: userName,
            color: userColor,
          });

          logger.info(
            `📄 [socket] ${userName} a rejoint le document ${documentId}`
          );
        } catch (error: any) {
          logger.error('❌ [socket] join-document:', error);
        }
      });

      // ---------- Quitter un document ----------
      socket.on('leave-document', async (payload: { documentId: string }) => {
        const { documentId } = payload;
        socket.leave(`doc:${documentId}`);

        const docUsers = this.documentUsers.get(documentId);
        if (docUsers) {
          const user = docUsers.get(socket.id);
          docUsers.delete(socket.id);

          if (user) {
            socket.to(`doc:${documentId}`).emit('user-left', {
              userId: user.userId,
            });
          }

          if (docUsers.size === 0) {
            this.documentUsers.delete(documentId);
            await this.flushDocumentSave(documentId);
          }
        }
      });

      // ---------- Édition d'un document ----------
      socket.on('edit-document', (payload: EditDocPayload) => {
        try {
          const { documentId, content, cursorPosition } = payload;
          const user = this.userSockets.get(socket.id);
          if (!user || !documentId) return; // Si le user n'est pas dans le projet, on ignore

          socket.to(`doc:${documentId}`).emit('document-updated', {
            content,
            userId: user.userId,
            userName: user.userName,
            version: Date.now(),
          });

          if (cursorPosition !== undefined) {
            socket.to(`doc:${documentId}`).emit('cursor-moved', {
              userId: user.userId,
              userName: user.userName,
              position: cursorPosition,
              documentId,
              socketId: socket.id,
            });
          }

          this.scheduleDocumentSave(documentId, content);
        } catch (error: any) {
          logger.error('❌ [socket] edit-document:', error);
        }
      });

      // ---------- Ping de présence ----------
      socket.on('presence-ping', (payload: { projectId: string }) => {
        updatePresence(payload.projectId, socket.id);
      });

      // ---------- Typing ----------
      socket.on('typing', (payload: TypingPayload) => {
        const { projectId, documentId, context, isTyping } = payload;
        const user = this.userSockets.get(socket.id);
        if (!user) return;

        const target = documentId
          ? `doc:${documentId}`
          : `project:${projectId}`;
        socket.to(target).emit('user-typing', {
          userId: user.userId,
          userName: user.userName,
          context,
          isTyping,
        });
      });

      // ---------- Get presence ----------
      socket.on('get-presence', (payload: { projectId: string }) => {
        socket.emit('presence-update', {
          users: getUniqueProjectUsers(payload.projectId),
        });
      });

      // ---------- Déconnexion ----------
      socket.on('disconnect', async () => {
        const user = this.userSockets.get(socket.id);
        if (user) {
          removeUser(user.projectId, socket.id);
          this.broadcastPresence(user.projectId);
          this.userSockets.delete(socket.id);
          logger.info(
            `👋 [socket] Déconnexion : ${socket.id} (${user.userName})`
          );
        }

        const docsToFlush: string[] = [];
        this.documentUsers.forEach((users, docId) => {
          if (users.has(socket.id)) {
            const docUser = users.get(socket.id)!;
            users.delete(socket.id);
            this.io.to(`doc:${docId}`).emit('user-left', {
              userId: docUser.userId,
            });

            if (users.size === 0) {
              this.documentUsers.delete(docId);
              docsToFlush.push(docId);
            }
          }
        });

        await Promise.all(
          docsToFlush.map((id) => this.flushDocumentSave(id))
        );
      });
    });
  }

  // ============================================================
  // Debounce des sauvegardes DB
  // ============================================================
  private scheduleDocumentSave(documentId: string, content: string): void {
    const existing = this.pendingUpdates.get(documentId);
    if (existing?.timer) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.flushDocumentSave(documentId).catch((err) =>
        logger.error('❌ flushDocumentSave:', err)
      );
    }, this.DEBOUNCE_MS);

    if (typeof timer.unref === 'function') timer.unref();

    this.pendingUpdates.set(documentId, {
      content,
      timer,
      lastQueuedAt: Date.now(),
    });
  }

  private async flushDocumentSave(documentId: string): Promise<void> {
    const pending = this.pendingUpdates.get(documentId);
    if (!pending) return;

    this.pendingUpdates.delete(documentId);
    if (pending.timer) clearTimeout(pending.timer);

    try {
      await db('collaboration_documents')
        .where({ id: documentId })
        .update({
          content: pending.content,
          version: db.raw('version + 1'),
          updatedAt: new Date().toISOString(),
        });
    } catch (err: any) {
      logger.error(
        `❌ [socket] flushDocumentSave échoué pour ${documentId}:`,
        err
      );
    }
  }

  // ============================================================
  // Cleanup présence
  // ============================================================
  private startCleanup(): void {
    startPresenceCleanup((projectId) => {
      this.broadcastPresence(projectId);
    });

    const pingInterval = setInterval(() => {
      this.io.emit('server-ping', { timestamp: Date.now() });
    }, 30000);

    if (typeof pingInterval.unref === 'function') {
      pingInterval.unref();
    }
  }

  private async broadcastPresence(projectId: string): Promise<void> {
    try {
      const users = getUniqueProjectUsers(projectId);
      this.io.to(`project:${projectId}`).emit('presence-update', { users });
    } catch (error: any) {
      logger.error('❌ [socket] broadcastPresence:', error);
    }
  }
}
