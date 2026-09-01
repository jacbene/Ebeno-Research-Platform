import { Server, Socket } from 'socket.io';
import { db } from '../db/knex';

interface CollaborationDocument {
  id: string;
  title: string;
  content: string;
  version: number;
  updatedAt: number;
}

interface User {
  id: string;
  name: string;
  color: string;
}

// Couleurs aléatoires pour les utilisateurs
const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', '#E76F51', '#F4A261', '#2A9D8F'];

export class CollaborationSocketHandler {
  private io: Server;
  private documents: Map<string, CollaborationDocument> = new Map();
  private documentUsers: Map<string, Map<string, User>> = new Map(); // docId -> userId -> User
  private userColors: Map<string, string> = new Map();

  constructor(io: Server) {
    this.io = io;
    this.setupEvents();
    console.log('✅ Socket.IO collaboration handler initialized');
  }

  private setupEvents() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`👤 User connected: ${socket.id}`);

      socket.on('join-document', async (data: { documentId: string, userId: string, userName: string }) => {
        const { documentId, userId, userName } = data;
        
        // Stocker les infos de l'utilisateur
        socket.data.userId = userId;
        socket.data.documentId = documentId;
        socket.join(documentId);

        // Récupérer le document
        let document = this.documents.get(documentId);
        if (!document) {
          // Charger depuis la base de données
          const dbDoc = await db('collaboration_documents')
            .where({ id: documentId })
            .first();
          
          if (dbDoc) {
            document = {
              id: dbDoc.id,
              title: dbDoc.title,
              content: dbDoc.content || '',
              version: dbDoc.version || 1,
              updatedAt: dbDoc.updatedAt || Date.now()
            };
            this.documents.set(documentId, document);
          } else {
            // Créer un nouveau document si inexistant
            document = {
              id: documentId,
              title: 'Nouveau document collaboratif',
              content: 'Contenu initial...',
              version: 1,
              updatedAt: Date.now()
            };
            this.documents.set(documentId, document);
            await db('collaboration_documents').insert({
              id: documentId,
              title: document.title,
              content: document.content,
              version: document.version,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          }
        }

        // Ajouter l'utilisateur au document
        if (!this.documentUsers.has(documentId)) {
          this.documentUsers.set(documentId, new Map());
        }
        
        const usersMap = this.documentUsers.get(documentId)!;
        const color = this.userColors.get(userId) || colors[Math.floor(Math.random() * colors.length)];
        this.userColors.set(userId, color);
        
        usersMap.set(userId, {
          id: userId,
          name: userName || 'Utilisateur',
          color: color
        });

        // Envoyer le contenu actuel à l'utilisateur
        socket.emit('document-content', {
          document: document,
          users: Array.from(usersMap.values())
        });

        // Notifier les autres utilisateurs du nouveau participant
        socket.to(documentId).emit('user-joined', {
          userId,
          userName: userName || 'Utilisateur',
          color: color
        });

        // Envoyer la liste des utilisateurs au nouveau participant
        socket.emit('users-list', Array.from(usersMap.values()));

        console.log(`📄 User ${userId} joined document ${documentId}`);
      });

      // Édition en temps réel
      socket.on('edit-document', async (data: { documentId: string, content: string }) => {
        const { documentId, content } = data;
        const userId = socket.data.userId;

        if (!userId) return;

        // Mettre à jour le document en mémoire
        const document = this.documents.get(documentId);
        if (document) {
          document.content = content;
          document.version += 1;
          document.updatedAt = Date.now();
          this.documents.set(documentId, document);

          // Sauvegarder en base de données (avec debounce pour éviter trop d'écritures)
          await db('collaboration_documents')
            .where({ id: documentId })
            .update({
              content: content,
              version: document.version,
              updatedAt: Date.now()
            });

          // Diffuser aux autres utilisateurs
          socket.to(documentId).emit('document-updated', {
            content: content,
            userId: userId,
            version: document.version,
            timestamp: Date.now()
          });
        }
      });

      // Cursus en temps réel
      socket.on('cursor-move', (data: { documentId: string, position: { line: number, ch: number } }) => {
        const { documentId, position } = data;
        const userId = socket.data.userId;

        if (!userId) return;

        const usersMap = this.documentUsers.get(documentId);
        if (!usersMap) return;

        const user = usersMap.get(userId);
        if (!user) return;

        socket.to(documentId).emit('cursor-updated', {
          userId: userId,
          name: user.name,
          color: user.color,
          position: position
        });
      });

      // Déconnexion
      socket.on('disconnect', () => {
        const userId = socket.data.userId;
        const documentId = socket.data.documentId;

        if (userId && documentId) {
          const usersMap = this.documentUsers.get(documentId);
          if (usersMap) {
            usersMap.delete(userId);
            this.io.to(documentId).emit('user-left', { userId });
            console.log(`👤 User ${userId} left document ${documentId}`);
          }
        }
        console.log(`👤 User disconnected: ${socket.id}`);
      });
    });
  }
}
