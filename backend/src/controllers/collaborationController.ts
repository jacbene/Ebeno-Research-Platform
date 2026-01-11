
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ProjectRole } from '@prisma/client';

class CollaborationController {
  async createCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const { title, projectId, collaborators = [] } = req.body;

      if (!title || !title.trim() || !projectId) {
        return res.status(400).json({ success: false, message: 'Le titre et le projet sont requis' });
      }

      const projectMember = await prisma.projectMember.findFirst({
        where: { projectId, userId, role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] } },
      });

      if (!projectMember) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }
      
      const participantIds = [userId, ...collaborators.map((c: { userId: string }) => c.userId)];

      const collaboration = await prisma.collaborationSession.create({
        data: {
          title: title.trim(),
          project: { connect: { id: projectId } },
          createdBy: { connect: { id: userId } },
          participants: { connect: participantIds.map(id => ({ id })) },
          type: 'DOCUMENT', // Type par défaut
        },
        include: {
          project: { select: { id: true, title: true } },
          createdBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
          participants: { select: { profile: { select: { firstName: true, lastName: true } } } },
        },
      });

      return res.status(201).json({ success: true, data: collaboration });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getCollaborationsByProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const where: any = {
        projectId: projectId as string,
        participants: { some: { id: userId } },
      };

      const [collaborations, total] = await Promise.all([
        prisma.collaborationSession.findMany({
          where,
          include: {
            project: { select: { id: true, title: true } },
            createdBy: { select: { profile: { select: { firstName: true, lastName: true } } } },
            _count: { select: { participants: true, comments: true } },
          },
          orderBy: { updatedAt: 'desc' },
          skip: (Number(page) - 1) * Number(limit),
          take: Number(limit),
        }),
        prisma.collaborationSession.count({ where }),
      ]);

      return res.status(200).json({ 
        success: true, 
        data: collaborations, 
        pagination: { 
          page: Number(page), 
          limit: Number(limit), 
          total, 
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }
  
  async getCollaborationById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const collaboration = await prisma.collaborationSession.findFirst({
        where: { id, participants: { some: { id: userId } } },
        include: {
          project: { select: { id: true, title: true } },
          createdBy: { select: { id: true, profile: true } },
          participants: { select: { id: true, email: true, profile: true } },
          comments: { 
            include: { user: {select: { profile: true } } },
            orderBy: { createdAt: 'desc' }
          },
          _count: { select: { participants: true, comments: true } }
        },
      });

      if (!collaboration) {
        return res.status(404).json({ success: false, message: 'Non trouvé' });
      }

      return res.status(200).json({ success: true, data: collaboration });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async updateCollaborationContent(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, content } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const canUpdate = await prisma.collaborationSession.findFirst({
          where: {
              id,
              participants: { some: { id: userId } }
          }
      });

      if (!canUpdate) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }

      const updated = await prisma.collaborationSession.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(content && { content: content, version: { increment: 1 } }),
        },
      });

      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async deleteCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const collaboration = await prisma.collaborationSession.findFirst({
        where: { id, createdById: userId },
      });

      if (!collaboration) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }

      await prisma.collaborationSession.delete({ where: { id } });

      return res.status(200).json({ success: true, message: 'Supprimé' });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async manageCollaborationParticipants(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const { userIds, action } = req.body; // userIds: string[], action: 'add' | 'remove'

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const collaboration = await prisma.collaborationSession.findFirst({
            where: { id, createdById: userId },
        });

        if (!collaboration) {
            return res.status(403).json({ success: false, message: 'Non autorisé à gérer les participants' });
        }

        if (action === 'add') {
            await prisma.collaborationSession.update({
                where: { id },
                data: { participants: { connect: userIds.map((id: string) => ({ id })) } },
            });
        } else if (action === 'remove') {
            const creatorId = collaboration.createdById;
            const filteredUserIds = userIds.filter((id: string) => id !== creatorId);

            await prisma.collaborationSession.update({
                where: { id },
                data: { participants: { disconnect: filteredUserIds.map((id: string) => ({ id })) } },
            });
        }

        const updatedParticipants = await prisma.collaborationSession.findUnique({
            where: { id },
            select: {
                participants: {
                    select: { id: true, email: true, profile: true }
                }
            }
        });

        return res.status(200).json({ success: true, data: updatedParticipants?.participants });

    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getCollaborationHistory(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const isParticipant = await prisma.collaborationSession.findFirst({
            where: { id, participants: { some: { id: userId } } }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        const history = await prisma.collaborationHistory.findMany({
            where: { sessionId: id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { firstName: true, lastName: true } }
                    }
                }
            }
        });

        return res.status(200).json({ success: true, data: history });
    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getCollaborationCursors(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const isParticipant = await prisma.collaborationSession.findFirst({
            where: { id, participants: { some: { id: userId } } }
        });

        if (!isParticipant) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        const cursors = await prisma.collaborationCursor.findMany({
            where: { sessionId: id, NOT: { userId: userId } },
            include: {
                user: {
                    select: {
                        id: true,
                        profile: { select: { firstName: true, lastName: true, avatar: true } }
                    }
                }
            }
        });

        return res.status(200).json({ success: true, data: cursors });
    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }
}

export const collaborationController = new CollaborationController();
export default collaborationController;
