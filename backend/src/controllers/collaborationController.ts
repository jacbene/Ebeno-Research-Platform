import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { CollaborationRole, CollaborationStatus } from '@prisma/client';

class CollaborationController {
  // ==================== CRÉATION DE COLLABORATION ====================
  async createCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const { 
        title, 
        description, 
        projectId, 
        collaborators = [], 
        dueDate,
        objectives 
      } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Le titre de la collaboration est requis',
        });
      }

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Le projet est requis',
        });
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
          role: { in: ['OWNER', 'EDITOR'] },
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à créer des collaborations dans ce projet',
        });
      }

      // Créer la collaboration
      const collaboration = await prisma.collaboration.create({
        data: {
          title: title.trim(),
          description: description?.trim() || '',
          projectId,
          createdBy: userId,
          status: CollaborationStatus.PLANNING,
          dueDate: dueDate ? new Date(dueDate) : null,
          objectives: objectives || [],
          collaborators: {
            create: [
              // Ajouter le créateur comme admin
              {
                userId,
                role: CollaborationRole.ADMIN,
                joinedAt: new Date(),
              },
              // Ajouter les autres collaborateurs
              ...collaborators.map((collab: { userId: string, role?: CollaborationRole }) => ({
                userId: collab.userId,
                role: collab.role || CollaborationRole.MEMBER,
                invitedBy: userId,
                invitedAt: new Date(),
              })),
            ],
          },
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
            },
          },
          createdByUser: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: collaboration,
        message: 'Collaboration créée avec succès',
      });
    } catch (error: any) {
      console.error('Error creating collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création de la collaboration',
        error: error.message,
      });
    }
  }

  // ==================== LECTURE ====================
  async getCollaborations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const { 
        projectId, 
        status, 
        role,
        page = 1, 
        limit = 20 
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Construire la requête where
      const where: any = {
        OR: [
          // Collaborations où l'utilisateur est membre
          { collaborators: { some: { userId } } },
          // Collaborations dans des projets où l'utilisateur est membre
          { project: { members: { some: { userId } } } },
        ],
      };

      if (projectId) {
        where.projectId = projectId as string;
      }

      if (status) {
        where.status = status as CollaborationStatus;
      }

      const [collaborations, total] = await Promise.all([
        prisma.collaboration.findMany({
          where,
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            createdByUser: {
              select: {
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            collaborators: {
              where: role ? { role: role as CollaborationRole } : undefined,
              include: {
                user: {
                  select: {
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
            _count: {
              select: {
                tasks: true,
                discussions: true,
                documents: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.collaboration.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: collaborations,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching collaborations:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des collaborations',
        error: error.message,
      });
    }
  }

  async getCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const collaboration = await prisma.collaboration.findFirst({
        where: {
          id,
          OR: [
            { collaborators: { some: { userId } } },
            { project: { members: { some: { userId } } } },
          ],
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          createdByUser: {
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  discipline: true,
                  affiliation: true,
                },
              },
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                      discipline: true,
                      affiliation: true,
                    },
                  },
                },
              },
            },
          },
          tasks: {
            where: { parentId: null }, // Tâches principales seulement
            include: {
              assignedTo: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  subtasks: true,
                  comments: true,
                },
              },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
          },
          discussions: {
            include: {
              createdBy: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  comments: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
          documents: {
            include: {
              uploadedBy: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
            orderBy: { uploadedAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              tasks: true,
              discussions: true,
              documents: true,
              collaborators: true,
            },
          },
        },
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration non trouvée ou accès refusé',
        });
      }

      return res.status(200).json({
        success: true,
        data: collaboration,
      });
    } catch (error: any) {
      console.error('Error fetching collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la collaboration',
        error: error.message,
      });
    }
  }

  // ==================== MISE À JOUR ====================
  async updateCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, description, status, dueDate, objectives } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est admin de la collaboration
      const userRole = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId: id,
          userId,
          role: CollaborationRole.ADMIN,
        },
      });

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Seuls les administrateurs peuvent modifier la collaboration',
        });
      }

      const collaboration = await prisma.collaboration.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description.trim() }),
          ...(status && { status }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(objectives && { objectives }),
        },
        include: {
          project: {
            select: {
              title: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: collaboration,
        message: 'Collaboration mise à jour avec succès',
      });
    } catch (error: any) {
      console.error('Error updating collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour de la collaboration',
        error: error.message,
      });
    }
  }

  // ==================== SUPPRESSION ====================
  async deleteCollaboration(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est admin de la collaboration ET créateur
      const collaboration = await prisma.collaboration.findFirst({
        where: {
          id,
          createdBy: userId,
        },
      });

      if (!collaboration) {
        return res.status(403).json({
          success: false,
          message: 'Seul le créateur peut supprimer cette collaboration',
        });
      }

      await prisma.collaboration.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Collaboration supprimée avec succès',
      });
    } catch (error: any) {
      console.error('Error deleting collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression de la collaboration',
        error: error.message,
      });
    }
  }

  // ==================== GESTION DES MEMBRES ====================
  async addMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: collaborationId } = req.params;
      const { userId: newUserId, role = CollaborationRole.MEMBER } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est admin de la collaboration
      const userRole = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId,
          userId,
          role: CollaborationRole.ADMIN,
        },
      });

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Seuls les administrateurs peuvent ajouter des membres',
        });
      }

      // Vérifier que le nouveau membre a accès au projet
      const collaboration = await prisma.collaboration.findUnique({
        where: { id: collaborationId },
        select: { projectId: true },
      });

      if (!collaboration) {
        return res.status(404).json({
          success: false,
          message: 'Collaboration non trouvée',
        });
      }

      const projectAccess = await prisma.projectMember.findFirst({
        where: {
          projectId: collaboration.projectId,
          userId: newUserId,
        },
      });

      if (!projectAccess) {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur doit d\'abord être membre du projet',
        });
      }

      // Vérifier si l'utilisateur est déjà membre
      const existingMember = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId,
          userId: newUserId,
        },
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Cet utilisateur est déjà membre de la collaboration',
        });
      }

      const member = await prisma.collaborationMember.create({
        data: {
          collaborationId,
          userId: newUserId,
          role,
          invitedBy: userId,
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
        include: {
          user: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        data: member,
        message: 'Membre ajouté à la collaboration',
      });
    } catch (error: any) {
      console.error('Error adding member to collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout du membre',
        error: error.message,
      });
    }
  }

  async removeMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: collaborationId, memberId } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est admin de la collaboration
      const userRole = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId,
          userId,
          role: CollaborationRole.ADMIN,
        },
      });

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Seuls les administrateurs peuvent retirer des membres',
        });
      }

      // Empêcher un admin de se retirer lui-même s'il est le seul admin
      if (memberId === userId) {
        const adminCount = await prisma.collaborationMember.count({
          where: {
            collaborationId,
            role: CollaborationRole.ADMIN,
          },
        });

        if (adminCount <= 1) {
          return res.status(400).json({
            success: false,
            message: 'La collaboration doit avoir au moins un administrateur',
          });
        }
      }

      await prisma.collaborationMember.delete({
        where: {
          collaborationId_userId: {
            collaborationId,
            userId: memberId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Membre retiré de la collaboration',
      });
    } catch (error: any) {
      console.error('Error removing member from collaboration:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors du retrait du membre',
        error: error.message,
      });
    }
  }

  async updateMemberRole(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: collaborationId, memberId } = req.params;
      const { role } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est admin de la collaboration
      const userRole = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId,
          userId,
          role: CollaborationRole.ADMIN,
        },
      });

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: 'Seuls les administrateurs peuvent modifier les rôles',
        });
      }

      const member = await prisma.collaborationMember.update({
        where: {
          collaborationId_userId: {
            collaborationId,
            userId: memberId,
          },
        },
        data: { role },
        include: {
          user: {
            select: {
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return res.status(200).json({
        success: true,
        data: member,
        message: 'Rôle du membre mis à jour',
      });
    } catch (error: any) {
      console.error('Error updating member role:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du rôle',
        error: error.message,
      });
    }
  }

  // ==================== STATISTIQUES ====================
  async getCollaborationStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur a accès à la collaboration
      const access = await prisma.collaborationMember.findFirst({
        where: {
          collaborationId: id,
          userId,
        },
      });

      if (!access) {
        return res.status(403).json({
          success: false,
          message: 'Accès refusé',
        });
      }

      const stats = await prisma.$transaction([
        // Nombre de tâches par statut
        prisma.collaborationTask.groupBy({
          by: ['status'],
          where: { collaborationId: id },
          _count: { status: true },
        }),
        // Nombre de discussions
        prisma.collaborationDiscussion.count({
          where: { collaborationId: id },
        }),
        // Nombre de documents
        prisma.collaborationDocument.count({
          where: { collaborationId: id },
        }),
        // Dernière activité
        prisma.collaborationTask.findFirst({
          where: { collaborationId: id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      return res.status(200).json({
        success: true,
        data: {
          tasksByStatus: stats[0],
          discussionCount: stats[1],
          documentCount: stats[2],
          lastActivity: stats[3]?.updatedAt || null,
        },
      });
    } catch (error: any) {
      console.error('Error fetching collaboration stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des statistiques',
        error: error.message,
      });
    }
  }
}

export const collaborationController = new CollaborationController();
export default collaborationController;
