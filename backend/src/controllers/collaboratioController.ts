// backend/controllers/collaborationController.ts
// URL: /api/collaboration
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { Server as SocketIOServer } from 'socket.io';
import { createCollaborationSessionSchema, updateCollaborationDocumentSchema } from '../validators/collaboration.validator';

export class CollaborationController {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Nouvelle connexion socket:', socket.id);

      // Rejoindre une session de collaboration
      socket.on('joinSession', async (data) => {
        const { sessionId, userId } = data;
        
        // Vérifier les permissions
        const session = await prisma.collaborationSession.findUnique({
          where: { id: sessionId },
          include: { participants: true }
        });

        if (!session) {
          socket.emit('error', { message: 'Session non trouvée' });
          return;
        }

        // Rejoindre la room
        socket.join(`session:${sessionId}`);
        
        // Ajouter l'utilisateur aux participants
        await prisma.collaborationSession.update({
          where: { id: sessionId },
          data: {
            participants: {
              connect: { id: userId }
            }
          }
        });

        // Informer les autres participants
        socket.to(`session:${sessionId}`).emit('userJoined', {
          userId,
          socketId: socket.id,
          timestamp: new Date()
        });

        // Envoyer l'état actuel au nouveau participant
        socket.emit('sessionState', {
          content: session.content,
          participants: session.participants,
          cursors: this.getActiveCursors(sessionId)
        });
      });

      // Mise à jour de document
      socket.on('updateDocument', async (data) => {
        const { sessionId, userId, operations, version } = data;
        
        // Appliquer les opérations (OT - Operational Transformation)
        const result = await this.applyOperations(sessionId, operations, version);
        
        if (result.success) {
          // Diffuser aux autres participants
          socket.to(`session:${sessionId}`).emit('documentUpdated', {
            operations: result.operations,
            version: result.newVersion,
            updatedBy: userId
          });

          // Mettre à jour la base de données
          await this.updateDocumentInDatabase(sessionId, result.content, result.newVersion);
        }
      });

      // Mise à jour du curseur
      socket.on('cursorMove', (data) => {
        const { sessionId, userId, position } = data;
        
        // Diffuser la position du curseur
        socket.to(`session:${sessionId}`).emit('cursorUpdated', {
          userId,
          position,
          timestamp: new Date()
        });
      });

      // Quitter une session
      socket.on('leaveSession', async (data) => {
        const { sessionId, userId } = data;
        
        socket.leave(`session:${sessionId}`);
        
        // Informer les autres participants
        socket.to(`session:${sessionId}`).emit('userLeft', {
          userId,
          timestamp: new Date()
        });
      });
    });
  }

  private async applyOperations(sessionId: string, operations: any[], version: number) {
    // Implémentation de Operational Transformation
    // Pour simplifier, version basique sans gestion de conflits avancée
    
    const session = await prisma.collaborationSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new Error('Session non trouvée');
    }

    // Vérifier la version
    if (session.version !== version) {
      return {
        success: false,
        error: 'Version mismatch',
        currentVersion: session.version
      };
    }

    // Appliquer les opérations (simplifié)
    let content = session.content;
    operations.forEach(op => {
      content = this.applyOperation(content, op);
    });

    return {
      success: true,
      content,
      operations,
      newVersion: version + 1
    };
  }

  private applyOperation(content: string, operation: any): string {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               operation.text + 
               content.slice(operation.position);
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + operation.length);
      default:
        return content;
    }
  }

  // Méthodes REST
  async createCollaborationSession(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      const data = createCollaborationSessionSchema.parse(req.body);
      
      const session = await prisma.collaborationSession.create({
        data: {
          ...data,
          createdById: userId,
          participants: {
            connect: { id: userId }
          }
        },
        include: {
          createdBy: {
            include: {
              profile: true
            }
          },
          participants: true
        }
      });

      res.status(201).json({
        success: true,
        data: session
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCollaborationSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }
      const userId = req.user.id;
      
      const session = await prisma.collaborationSession.findUnique({
        where: { id },
        include: {
          createdBy: true,
          participants: true,
          document: true
        }
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session non trouvée'
        });
      }

      // Vérifier les permissions
      const isParticipant = session.participants.some((p: any) => p.id === userId);
      const isCreator = session.createdById === userId;
      
      if (!isParticipant && !isCreator) {
        return res.status(403).json({
          success: false,
          error: 'Non autorisé'
        });
      }

      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  private getActiveCursors(sessionId: string) {
    // Récupérer les curseurs actifs de la session
    // Implémentation simplifiée
    return [];
  }

  private async updateDocumentInDatabase(sessionId: string, content: string, version: number) {
    await prisma.collaborationSession.update({
      where: { id: sessionId },
      data: {
        content,
        version,
        updatedAt: new Date()
      }
    });
  }
}
