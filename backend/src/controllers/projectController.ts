import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { z } from 'zod';

// Schémas de validation
const createProjectSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
  tags: z.array(z.string()).optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
});

export const projectController = {
  // Récupérer tous les projets de l'utilisateur
  async getUserProjects(req: Request, res: Response) {
    try {
      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { ownerId: req.user!.id },
            { members: { some: { userId: req.user!.id } } }
          ]
        },
        include: {
          owner: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          },
          tags: {
            include: { tag: true }
          },
          _count: {
            select: {
              transcriptions: true,
              members: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des projets' });
    }
  },

  // Créer un nouveau projet
  async createProject(req: Request, res: Response) {
    try {
      const validatedData = createProjectSchema.parse(req.body);
      
      const project = await prisma.project.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          status: validatedData.status || 'ACTIVE',
          visibility: validatedData.visibility || 'PRIVATE',
          ownerId: req.user!.id,
          members: {
            create: {
              userId: req.user!.id,
              role: 'OWNER'
            }
          }
        },
        include: {
          owner: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          }
        }
      });

      // Ajouter les tags si fournis
      if (validatedData.tags && validatedData.tags.length > 0) {
        await Promise.all(validatedData.tags.map(async (tagName) => {
          // Chercher ou créer le tag
          let tag = await prisma.tag.findFirst({
            where: { name: tagName, category: 'user' }
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                name: tagName,
                category: 'user'
              }
            });
          }

          // Associer le tag au projet
          await prisma.projectTag.create({
            data: {
              projectId: project.id,
              tagId: tag.id
            }
          });
        }));
      }

      const projectWithTags = await prisma.project.findUnique({
        where: { id: project.id },
        include: {
          tags: { include: { tag: true } },
          owner: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          }
        }
      });

      res.status(201).json(projectWithTags);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Données invalides', details: error.errors });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Erreur lors de la création du projet' });
    }
  },

  // Récupérer un projet par ID
  async getProjectById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          },
          tags: {
            include: { tag: true }
          },
          transcriptions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          _count: {
            select: {
              transcriptions: true,
              members: true
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      // Vérifier les permissions
      const isMember = project.members.some(m => m.user.id === req.user!.id);
      if (!isMember && project.visibility === 'PRIVATE') {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du projet' });
    }
  },

  // Mettre à jour un projet
  async updateProject(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const isOwner = project.ownerId === req.user!.id;
      if (!isOwner) {
        return res.status(403).json({ error: 'Seul le propriétaire peut modifier ce projet' });
      }

      const updatedProject = await prisma.project.update({
        where: { id },
        data: validatedData,
        include: {
          owner: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          },
          tags: { include: { tag: true } }
        }
      });

      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Données invalides', details: error.errors });
      }
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du projet' });
    }
  },

  // Supprimer un projet
  async deleteProject(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut supprimer ce projet' });
      }

      await prisma.project.delete({
        where: { id }
      });

      res.json({ message: 'Projet supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du projet' });
    }
  },

  // Ajouter un membre à un projet
  async addMember(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = addMemberSchema.parse(req.body);

      // Vérifier que l'utilisateur peut ajouter des membres
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'ajouter des membres' });
      }

      // Trouver l'utilisateur à ajouter
      const userToAdd = await prisma.user.findUnique({
        where: { email: validatedData.email },
        include: { profile: true }
      });

      if (!userToAdd) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier si l'utilisateur est déjà membre
      const isAlreadyMember = project.members.some(m => m.userId === userToAdd.id);
      if (isAlreadyMember) {
        return res.status(400).json({ error: 'Cet utilisateur est déjà membre du projet' });
      }

      // Ajouter le membre
      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          members: {
            create: {
              userId: userToAdd.id,
              role: validatedData.role
            }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true }
                  }
                }
              }
            }
          }
        }
      });

      res.json(updatedProject);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Données invalides', details: error.errors });
      }
      console.error('Error adding member:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
    }
  },

  // Supprimer un membre d'un projet
  async removeMember(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;

      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      const isOwner = project.ownerId === req.user!.id;
      
      // Seul le propriétaire peut retirer des membres (sauf se retirer soi-même)
      if (!isOwner && userId !== req.user!.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut retirer des membres' });
      }

      // Le propriétaire ne peut pas se retirer lui-même
      if (isOwner && userId === req.user!.id) {
        return res.status(400).json({ error: 'Le propriétaire ne peut pas quitter son propre projet' });
      }

      await prisma.projectMember.delete({
        where: {
          projectId_userId: {
            projectId: id,
            userId
          }
        }
      });

      res.json({ message: 'Membre retiré avec succès' });
    } catch (error) {
      console.error('Error removing member:', error);
      res.status(500).json({ error: 'Erreur lors du retrait du membre' });
    }
  },

  // Mettre à jour le rôle d'un membre
  async updateMemberRole(req: Request, res: Response) {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      // Validation du rôle
      if (!['VIEWER', 'EDITOR'].includes(role)) {
        return res.status(400).json({ error: 'Rôle invalide' });
      }

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut modifier les rôles' });
      }

      // Ne pas modifier le rôle du propriétaire
      if (userId === req.user!.id) {
        return res.status(400).json({ error: 'Impossible de modifier le rôle du propriétaire' });
      }

      const updatedMember = await prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: id,
            userId
          }
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });

      res.json(updatedMember);
    } catch (error) {
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
    }
  },

  // Ajouter un tag à un projet
  async addTag(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { tagName } = req.body;

      if (!tagName || typeof tagName !== 'string') {
        return res.status(400).json({ error: 'Nom de tag requis' });
      }

      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'ajouter des tags' });
      }

      // Chercher ou créer le tag
      let tag = await prisma.tag.findFirst({
        where: { name: tagName, category: 'user' }
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            name: tagName,
            category: 'user'
          }
        });
      }

      // Vérifier si le tag est déjà associé au projet
      const existingProjectTag = await prisma.projectTag.findUnique({
        where: {
          projectId_tagId: {
            projectId: id,
            tagId: tag.id
          }
        }
      });

      if (existingProjectTag) {
        return res.status(400).json({ error: 'Ce tag est déjà associé au projet' });
      }

      // Associer le tag au projet
      const projectTag = await prisma.projectTag.create({
        data: {
          projectId: id,
          tagId: tag.id
        },
        include: { tag: true }
      });

      res.json(projectTag);
    } catch (error) {
      console.error('Error adding tag:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du tag' });
    }
  },

  // Supprimer un tag d'un projet
  async removeTag(req: Request, res: Response) {
    try {
      const { id, tagId } = req.params;

      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de retirer des tags' });
      }

      await prisma.projectTag.delete({
        where: {
          projectId_tagId: {
            projectId: id,
            tagId
          }
        }
      });

      res.json({ message: 'Tag retiré avec succès' });
    } catch (error) {
      console.error('Error removing tag:', error);
      res.status(500).json({ error: 'Erreur lors du retrait du tag' });
    }
  }
};