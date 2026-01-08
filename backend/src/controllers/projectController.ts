import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ProjectRole } from '@prisma/client';

class ProjectController {
  // ==================== CRÉATION ====================
  async createProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const { title, description, tags } = req.body;

      if (!title || title.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Le titre est requis (minimum 3 caractères)',
        });
      }

      const project = await prisma.project.create({
        data: {
          title: title.trim(),
          description: description?.trim() || '',
          createdBy: userId,
          members: {
            create: {
              userId,
              role: ProjectRole.OWNER,
            },
          },
          ...(tags && tags.length > 0 && {
            tags: {
              create: tags.map((tagName: string) => ({
                name: tagName.trim(),
                color: this.generateRandomColor(),
                createdBy: userId,
              })),
            },
          }),
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
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
          tags: true,
        },
      });

      return res.status(201).json({
        success: true,
        data: project,
        message: 'Projet créé avec succès',
      });
    } catch (error: any) {
      console.error('Error creating project:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du projet',
        error: error.message,
      });
    }
  }

  // ==================== LECTURE ====================
  async getProjects(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const { search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        members: {
          some: { userId },
        },
      };

      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          include: {
            members: {
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
            tags: true,
            _count: {
              select: {
                documents: true,
                transcriptions: true,
                memos: true,
                annotations: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.project.count({ where }),
      ]);

      return res.status(200).json({
        success: true,
        data: projects,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des projets',
        error: error.message,
      });
    }
  }

  async getProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      const project = await prisma.project.findFirst({
        where: {
          id,
          members: {
            some: { userId },
          },
        },
        include: {
          members: {
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
          tags: true,
          documents: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
          transcriptions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              document: {
                select: {
                  title: true,
                  type: true,
                },
              },
            },
          },
          memos: {
            take: 10,
            orderBy: { updatedAt: 'desc' },
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
              documents: true,
              transcriptions: true,
              memos: true,
              annotations: true,
              codes: true,
            },
          },
        },
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Projet non trouvé ou accès refusé',
        });
      }

      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (error: any) {
      console.error('Error fetching project:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du projet',
        error: error.message,
      });
    }
  }

  // ==================== MISE À JOUR ====================
  async updateProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, description } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est propriétaire ou éditeur
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId,
          role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] },
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à modifier ce projet',
        });
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description.trim() }),
        },
        include: {
          members: {
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
          tags: true,
        },
      });

      return res.status(200).json({
        success: true,
        data: project,
        message: 'Projet mis à jour avec succès',
      });
    } catch (error: any) {
      console.error('Error updating project:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du projet',
        error: error.message,
      });
    }
  }

  // ==================== SUPPRESSION ====================
  async deleteProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est propriétaire
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId: id,
          userId,
          role: ProjectRole.OWNER,
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Seul le propriétaire peut supprimer ce projet',
        });
      }

      await prisma.project.delete({
        where: { id },
      });

      return res.status(200).json({
        success: true,
        message: 'Projet supprimé avec succès',
      });
    } catch (error: any) {
      console.error('Error deleting project:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du projet',
        error: error.message,
      });
    }
  }

  // ==================== MEMBRES ====================
  async addMember(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: projectId } = req.params;
      const { email, role = ProjectRole.VIEWER } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est propriétaire ou éditeur
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
          role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] },
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à ajouter des membres',
        });
      }

      // Trouver l'utilisateur par email
      const userToAdd = await prisma.user.findFirst({
        where: { email },
        include: { profile: true },
      });

      if (!userToAdd) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé',
        });
      }

      // Vérifier si l'utilisateur est déjà membre
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: userToAdd.id,
        },
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Cet utilisateur est déjà membre du projet',
        });
      }

      const member = await prisma.projectMember.create({
        data: {
          projectId,
          userId: userToAdd.id,
          role,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
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
        message: 'Membre ajouté avec succès',
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
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
      const { id: projectId, userId: memberId } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est propriétaire ou éditeur
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
          role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] },
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à supprimer des membres',
        });
      }

      // Empêcher un propriétaire de se supprimer lui-même
      if (memberId === userId) {
        const ownerCheck = await prisma.projectMember.findFirst({
          where: {
            projectId,
            userId,
            role: ProjectRole.OWNER,
          },
        });

        if (ownerCheck) {
          const otherOwners = await prisma.projectMember.count({
            where: {
              projectId,
              role: ProjectRole.OWNER,
              NOT: { userId },
            },
          });

          if (otherOwners === 0) {
            return res.status(400).json({
              success: false,
              message: 'Le projet doit avoir au moins un propriétaire',
            });
          }
        }
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId,
            userId: memberId,
          },
        },
      });

      return res.status(200).json({
        success: true,
        message: 'Membre supprimé avec succès',
      });
    } catch (error: any) {
      console.error('Error removing member:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du membre',
        error: error.message,
      });
    }
  }

  // ==================== TAGS ====================
  async addTag(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: projectId } = req.params;
      const { name, color } = req.body;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à ajouter des tags',
        });
      }

      const tag = await prisma.projectTag.create({
        data: {
          projectId,
          name: name.trim(),
          color: color || this.generateRandomColor(),
          createdBy: userId,
        },
      });

      return res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag ajouté avec succès',
      });
    } catch (error: any) {
      console.error('Error adding tag:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout du tag',
        error: error.message,
      });
    }
  }

  async removeTag(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: projectId, tagId } = req.params;

      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          message: 'Non authentifié' 
        });
      }

      // Vérifier que l'utilisateur est propriétaire ou éditeur
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
          role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] },
        },
      });

      if (!projectMember) {
        return res.status(403).json({
          success: false,
          message: 'Non autorisé à supprimer des tags',
        });
      }

      await prisma.projectTag.delete({
        where: { id: tagId },
      });

      return res.status(200).json({
        success: true,
        message: 'Tag supprimé avec succès',
      });
    } catch (error: any) {
      console.error('Error removing tag:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression du tag',
        error: error.message,
      });
    }
  }

  // ==================== UTILITAIRES ====================
  private generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
      '#EF476F', '#1B9AAA', '#FF9F1C', '#2A9D8F', '#E63946',
      '#A8DADC', '#457B9D', '#F4A261', '#2A9D8F', '#E76F51',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

// Exportez une instance (cohérent avec userController et referenceController)
export const projectController = new ProjectController();
