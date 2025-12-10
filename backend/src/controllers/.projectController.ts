 import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';

// Schémas de validation améliorés
const createProjectSchema = z.object({
  title: z.string().min(1, 'Le titre est requis').max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).default('PRIVATE'),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags autorisés').optional(),
});

const updateProjectSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Au moins un champ doit être fourni pour la mise à jour'
});

const addMemberSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['VIEWER', 'EDITOR'])
});

const tagSchema = z.object({
  tagName: z.string().min(1, 'Le nom du tag est requis').max(50, 'Le nom du tag ne peut pas dépasser 50 caractères')
});

export const projectController = {
  // Récupérer tous les projets de l'utilisateur
  async getUserProjects(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const projects = await prisma.project.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { members: { some: { userId: req.user.id } } }
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
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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

  // Créer un nouveau projet avec transaction
  async createProject(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const validatedData = createProjectSchema.parse(req.body);
      
      const result = await prisma.$transaction(async (tx) => {
        // Créer le projet
        const project = await tx.project.create({
          data: {
            title: validatedData.title,
            description: validatedData.description,
            status: validatedData.status,
            visibility: validatedData.visibility,
            ownerId: req.user!.id,
            members: {
              create: {
                userId: req.user!.id,
                role: 'OWNER'
              }
            }
          }
        });

        // Ajouter les tags si fournis
        if (validatedData.tags && validatedData.tags.length > 0) {
          const uniqueTags = [...new Set(validatedData.tags)]; // Éliminer les doublons
          
          for (const tagName of uniqueTags) {
            // Chercher ou créer le tag
            let tag = await tx.tag.findFirst({
              where: { 
                name: tagName.toLowerCase(),
                category: 'user' 
              }
            });

            if (!tag) {
              tag = await tx.tag.create({
                data: {
                  name: tagName.toLowerCase(),
                  category: 'user'
                }
              });
            }

            // Associer le tag au projet
            await tx.projectTag.create({
              data: {
                projectId: project.id,
                tagId: tag.id
              }
            });
          }
        }

        // Récupérer le projet complet avec toutes les relations
        return await tx.project.findUnique({
          where: { id: project.id },
          include: {
            tags: { 
              include: { tag: true } 
            },
            owner: {
              select: {
                id: true,
                email: true,
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
                    email: true,
                    profile: {
                      select: { firstName: true, lastName: true }
                    }
                  }
                }
              }
            },
            _count: {
              select: {
                transcriptions: true,
                members: true
              }
            }
          }
        });
      });

      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Erreur lors de la création du projet' });
    }
  },

  // Récupérer un projet par ID
  async getProjectById(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id } = req.params;

      const project = await prisma.project.findUnique({
        where: { id },
        include: {
          owner: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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
            take: 5,
            where: {
              status: { not: 'DELETED' }
            }
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
      const isOwner = project.ownerId === req.user!.id;
      
      if (project.visibility === 'PRIVATE' && !isMember) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      if (project.visibility === 'TEAM' && !isMember) {
        return res.status(403).json({ error: 'Accès réservé aux membres du projet' });
      }

      // Pour PUBLIC, tout le monde peut voir
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du projet' });
    }
  },

  // Mettre à jour un projet
  async updateProject(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id } = req.params;
      const validatedData = updateProjectSchema.parse(req.body);

      // Vérifier que le projet existe et que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          ownerId: true,
          members: {
            where: { userId: req.user.id },
            select: { role: true }
          }
        }
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
              email: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          },
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.errors 
        });
      }
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du projet' });
    }
  },

  // Supprimer un projet (soft delete optionnel)
  async deleteProject(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id } = req.params;

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id },
        select: { ownerId: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user!.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut supprimer ce projet' });
      }

      // Utiliser une transaction pour supprimer toutes les relations
      await prisma.$transaction([
        // Supprimer les tags associés
        prisma.projectTag.deleteMany({
          where: { projectId: id }
        }),
        // Supprimer les membres
        prisma.projectMember.deleteMany({
          where: { projectId: id }
        }),
        // Supprimer le projet
        prisma.project.delete({
          where: { id }
        })
      ]);

      res.json({ message: 'Projet supprimé avec succès' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du projet' });
    }
  },

  // Ajouter un membre à un projet
  async addMember(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id } = req.params;
      const validatedData = addMemberSchema.parse(req.body);

      // Vérifier que le projet existe
      const project = await prisma.project.findUnique({
        where: { id },
        include: { 
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      // Vérifier les permissions
      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'ajouter des membres' });
      }

      // Trouver l'utilisateur à ajouter
      const userToAdd = await prisma.user.findUnique({
        where: { email: validatedData.email.toLowerCase() },
        select: { 
          id: true,
          email: true,
          profile: {
            select: { firstName: true, lastName: true }
          }
        }
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
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
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
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id, userId } = req.params;

      // Vérifier que le projet existe
      const project = await prisma.project.findUnique({
        where: { id },
        include: { 
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            }
          }
        }
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

      // Vérifier si le membre existe
      const memberExists = project.members.some(m => m.userId === userId);
      if (!memberExists) {
        return res.status(404).json({ error: 'Membre non trouvé dans ce projet' });
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
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id, userId } = req.params;
      const validatedData = updateMemberRoleSchema.parse(req.body);

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id },
        select: { ownerId: true }
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

      // Vérifier si le membre existe
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: id,
            userId
          }
        }
      });

      if (!existingMember) {
        return res.status(404).json({ error: 'Membre non trouvé' });
      }

      const updatedMember = await prisma.projectMember.update({
        where: {
          projectId_userId: {
            projectId: id,
            userId
          }
        },
        data: { role: validatedData.role },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true }
              }
            }
          }
        }
      });

      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Données invalides', details: error.errors });
      }
      console.error('Error updating member role:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
    }
  },

  // Ajouter un tag à un projet
  async addTag(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id } = req.params;
      const validatedData = tagSchema.parse(req.body);

      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id },
        include: { 
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'ajouter des tags' });
      }

      // Limiter le nombre de tags
      const tagCount = await prisma.projectTag.count({
        where: { projectId: id }
      });

      if (tagCount >= 10) {
        return res.status(400).json({ error: 'Maximum 10 tags autorisés par projet' });
      }

      // Chercher ou créer le tag (en minuscules pour éviter les doublons)
      const tagName = validatedData.tagName.toLowerCase();
      
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
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Données invalides', details: error.errors });
      }
      console.error('Error adding tag:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du tag' });
    }
  },

  // Supprimer un tag d'un projet
  async removeTag(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id, tagId } = req.params;

      // Vérifier les permissions
      const project = await prisma.project.findUnique({
        where: { id },
        include: { 
          members: {
            where: {
              role: { in: ['OWNER', 'EDITOR', 'VIEWER'] }
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      const userRole = project.members.find(m => m.userId === req.user!.id)?.role;
      if (!userRole || (userRole !== 'OWNER' && userRole !== 'EDITOR')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de retirer des tags' });
      }

      // Vérifier si le tag est associé au projet
      const projectTag = await prisma.projectTag.findUnique({
        where: {
          projectId_tagId: {
            projectId: id,
            tagId
          }
        }
      });

      if (!projectTag) {
        return res.status(404).json({ error: 'Tag non trouvé dans ce projet' });
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