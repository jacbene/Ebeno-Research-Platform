
import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Schémas de validation
const createProjectSchema = z.object({
  title: z.string()
    .min(1, 'Le titre est requis')
    .max(100, 'Le titre ne peut pas dépasser 100 caractères'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  visibility: z.enum(['PRIVATE', 'TEAM', 'PUBLIC']).default('PRIVATE'),
  tags: z.array(z.string())
    .max(10, 'Maximum 10 tags autorisés')
    .optional(),
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
  tagName: z.string()
    .min(1, 'Le nom du tag est requis')
    .max(50, 'Le nom du tag ne peut pas dépasser 50 caractères')
});

// Configuration du sélecteur de projet complet
const fullProjectSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  visibility: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      email: true,
      profile: {
        select: { firstName: true, lastName: true, avatar: true }
      }
    }
  },
  members: {
    select: {
      role: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { firstName: true, lastName: true, avatar: true }
          }
        }
      }
    }
  },
  tags: {
    select: {
      tag: {
        select: { id: true, name: true, color: true, category: true }
      }
    }
  },
  _count: {
    select: {
      transcriptions: true,
      documents: true,
      members: true,
    }
  }
} satisfies Prisma.ProjectSelect;

type FullProjectPayload = Prisma.ProjectGetPayload<{ select: typeof fullProjectSelect }>;

// Fonction utilitaire pour formater le projet avec le propriétaire comme membre virtuel
const formatProject = (project: FullProjectPayload) => {
  return {
    ...project,
    tags: project.tags.map(t => t.tag),
    // Ajouter le propriétaire comme premier membre avec rôle OWNER
    members: [
      {
        userId: project.owner.id,
        role: 'OWNER' as const,
        joinedAt: project.createdAt,
        user: project.owner
      },
      ...project.members.map(member => ({
        userId: member.user.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user
      }))
    ]
  };
};

// Fonction utilitaire pour vérifier les permissions
const checkProjectPermissions = async (projectId: string, userId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      ownerId: true,
      visibility: true,
      members: {
        where: { userId },
        select: { role: true }
      }
    }
  });

  if (!project) {
    return { allowed: false, isOwner: false, isMember: false, isEditor: false };
  }

  const isOwner = project.ownerId === userId;
  const isMember = project.members.length > 0;
  const isEditor = isOwner || (isMember && project.members[0].role === 'EDITOR');

  let allowed = false;
  
  if (project.visibility === 'PUBLIC') {
    allowed = true;
  } else if (project.visibility === 'TEAM') {
    allowed = isOwner || isMember;
  } else if (project.visibility === 'PRIVATE') {
    allowed = isOwner || isMember;
  }

  return { allowed, isOwner, isMember, isEditor, project };
};

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
        select: fullProjectSelect,
        orderBy: { updatedAt: 'desc' }
      });

      const formattedProjects = projects.map(formatProject);
      res.json(formattedProjects);
    } catch (error) {
      console.error('Erreur lors de la récupération des projets:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des projets' });
    }
  },

  // Créer un nouveau projet
  async createProject(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const validatedData = createProjectSchema.parse(req.body);
      
      const project = await prisma.$transaction(async (tx) => {
        // Créer le projet
        const newProject = await tx.project.create({
          data: {
            title: validatedData.title,
            description: validatedData.description,
            status: validatedData.status,
            visibility: validatedData.visibility,
            ownerId: req.user!.id,
          }
        });

        // Gérer les tags si fournis
        if (validatedData.tags && validatedData.tags.length > 0) {
          const uniqueTags = [...new Set(validatedData.tags.map(tag => tag.toLowerCase()))];
          
          for (const tagName of uniqueTags) {
            let tag = await tx.tag.findFirst({
              where: { 
                name: tagName,
                category: 'user' 
              }
            });

            if (!tag) {
              tag = await tx.tag.create({
                data: { 
                  name: tagName,
                  category: 'user'
                }
              });
            }

            await tx.projectTag.create({
              data: { 
                projectId: newProject.id, 
                tagId: tag.id 
              }
            });
          }
        }

        return newProject;
      });

      // Récupérer le projet complet
      const fullProject = await prisma.project.findUnique({
        where: { id: project.id },
        select: fullProjectSelect
      });

      if (!fullProject) {
        return res.status(500).json({ error: 'Erreur lors de la récupération du projet créé' });
      }

      res.status(201).json(formatProject(fullProject));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.flatten() 
        });
      }
      console.error('Erreur lors de la création du projet:', error);
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
        select: fullProjectSelect,
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      // Vérifier les permissions d'accès
      const { allowed } = await checkProjectPermissions(id, req.user.id);
      
      if (!allowed) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      res.json(formatProject(project));
    } catch (error) {
      console.error('Erreur lors de la récupération du projet:', error);
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

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id },
        select: { ownerId: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut modifier ce projet' });
      }

      const updatedProject = await prisma.project.update({
        where: { id },
        data: validatedData,
        select: fullProjectSelect
      });

      res.json(formatProject(updatedProject));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.flatten() 
        });
      }
      console.error('Erreur lors de la mise à jour du projet:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du projet' });
    }
  },

  // Supprimer un projet
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

      if (project.ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Seul le propriétaire peut supprimer ce projet' });
      }

      await prisma.project.delete({ 
        where: { id } 
      });

      res.status(200).json({ 
        message: 'Projet supprimé avec succès' 
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du projet' });
    }
  },

  // Ajouter un membre à un projet
  async addMember(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id: projectId } = req.params;
      const { email, role } = addMemberSchema.parse(req.body);

      // Vérifier les permissions (seul le propriétaire peut ajouter des membres)
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { 
          ownerId: true,
          members: { 
            select: { userId: true } 
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user.id) {
        return res.status(403).json({ 
          error: 'Seul le propriétaire peut ajouter des membres' 
        });
      }

      // Trouver l'utilisateur à ajouter
      const userToAdd = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true }
      });

      if (!userToAdd) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier si l'utilisateur est déjà membre ou propriétaire
      if (userToAdd.id === project.ownerId) {
        return res.status(400).json({ 
          error: 'Le propriétaire est déjà membre du projet' 
        });
      }

      const isAlreadyMember = project.members.some(m => m.userId === userToAdd.id);
      if (isAlreadyMember) {
        return res.status(400).json({ 
          error: 'Cet utilisateur est déjà membre du projet' 
        });
      }

      // Ajouter le membre
      await prisma.projectMember.create({
        data: { 
          projectId, 
          userId: userToAdd.id, 
          role 
        }
      });

      // Récupérer le projet mis à jour
      const updatedProject = await prisma.project.findUnique({
        where: { id: projectId },
        select: fullProjectSelect
      });

      if (!updatedProject) {
        return res.status(500).json({ 
          error: 'Erreur lors de la récupération du projet mis à jour' 
        });
      }

      res.status(201).json(formatProject(updatedProject));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.flatten() 
        });
      }
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          return res.status(400).json({ 
            error: 'Cet utilisateur est déjà membre du projet' 
          });
        }
      }

      console.error('Erreur lors de l\'ajout du membre:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du membre' });
    }
  },

  // Supprimer un membre d'un projet
  async removeMember(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id: projectId, userId: memberId } = req.params;

      // Vérifier que le projet existe
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { 
          ownerId: true,
          members: { 
            where: { userId: memberId },
            select: { userId: true }
          }
        }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      // Vérifier les permissions
      const isOwner = project.ownerId === req.user.id;
      const isSelfRemoval = req.user.id === memberId;

      // Le propriétaire ne peut pas être retiré
      if (memberId === project.ownerId) {
        return res.status(400).json({ 
          error: 'Le propriétaire ne peut pas être retiré du projet' 
        });
      }

      // Seul le propriétaire peut retirer des autres membres
      if (!isOwner && !isSelfRemoval) {
        return res.status(403).json({ 
          error: 'Vous n\'avez pas la permission de retirer ce membre' 
        });
      }

      // Vérifier si le membre existe
      const memberExists = project.members.length > 0;
      if (!memberExists) {
        return res.status(404).json({ 
          error: 'Membre non trouvé dans ce projet' 
        });
      }

      // Supprimer le membre
      await prisma.projectMember.delete({
        where: {
          projectId_userId: { 
            projectId, 
            userId: memberId 
          }
        }
      });

      res.status(200).json({ 
        message: 'Membre retiré avec succès' 
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ 
            error: 'Membre non trouvé dans ce projet' 
          });
        }
      }

      console.error('Erreur lors du retrait du membre:', error);
      res.status(500).json({ error: 'Erreur lors du retrait du membre' });
    }
  },

  // Mettre à jour le rôle d'un membre
  async updateMemberRole(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id: projectId, userId: memberId } = req.params;
      const { role } = updateMemberRoleSchema.parse(req.body);

      // Vérifier que l'utilisateur est propriétaire
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true }
      });

      if (!project) {
        return res.status(404).json({ error: 'Projet non trouvé' });
      }

      if (project.ownerId !== req.user.id) {
        return res.status(403).json({ 
          error: 'Seul le propriétaire peut modifier les rôles' 
        });
      }

      // Ne pas modifier le rôle du propriétaire
      if (memberId === project.ownerId) {
        return res.status(400).json({ 
          error: 'Impossible de modifier le rôle du propriétaire' 
        });
      }

      // Mettre à jour le rôle
      const updatedMember = await prisma.projectMember.update({
        where: {
          projectId_userId: { 
            projectId, 
            userId: memberId 
          }
        },
        data: { role },
        select: {
          role: true,
          joinedAt: true,
          user: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { 
                  firstName: true, 
                  lastName: true, 
                  avatar: true 
                }
              }
            }
          }
        }
      });

      res.json(updatedMember);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.flatten() 
        });
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ 
            error: 'Membre non trouvé' 
          });
        }
      }

      console.error('Erreur lors de la mise à jour du rôle:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du rôle' });
    }
  },

  // Ajouter un tag à un projet
  async addTag(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id: projectId } = req.params;
      const { tagName } = tagSchema.parse(req.body);

      // Vérifier les permissions
      const { allowed, isEditor } = await checkProjectPermissions(projectId, req.user.id);
      
      if (!allowed || !isEditor) {
        return res.status(403).json({ 
          error: 'Vous n\'avez pas la permission d\'ajouter des tags' 
        });
      }

      // Limiter le nombre de tags
      const tagCount = await prisma.projectTag.count({
        where: { projectId }
      });

      if (tagCount >= 10) {
        return res.status(400).json({ 
          error: 'Maximum 10 tags autorisés par projet' 
        });
      }

      // Chercher ou créer le tag
      const tagNameLower = tagName.toLowerCase();
      const tag = await prisma.tag.upsert({
        where: { 
          name_category: { 
            name: tagNameLower, 
            category: 'user' 
          } 
        },
        update: {},
        create: { 
          name: tagNameLower, 
          category: 'user' 
        }
      });

      // Associer le tag au projet
      try {
        await prisma.projectTag.create({
          data: { 
            projectId, 
            tagId: tag.id 
          },
        });

        // Récupérer le projet mis à jour
        const updatedProject = await prisma.project.findUnique({
          where: { id: projectId },
          select: fullProjectSelect
        });

        if (!updatedProject) {
          return res.status(500).json({ 
            error: 'Erreur lors de la récupération du projet mis à jour' 
          });
        }

        res.status(201).json(formatProject(updatedProject));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2002') {
            return res.status(400).json({ 
              error: 'Ce tag est déjà associé au projet' 
            });
          }
        }
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.flatten() 
        });
      }

      console.error('Erreur lors de l\'ajout du tag:', error);
      res.status(500).json({ error: 'Erreur lors de l\'ajout du tag' });
    }
  },

  // Supprimer un tag d'un projet
  async removeTag(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { id: projectId, tagId } = req.params;

      // Vérifier les permissions
      const { allowed, isEditor } = await checkProjectPermissions(projectId, req.user.id);
      
      if (!allowed || !isEditor) {
        return res.status(403).json({ 
          error: 'Vous n\'avez pas la permission de retirer des tags' 
        });
      }

      // Supprimer l'association
      await prisma.projectTag.delete({
        where: {
          projectId_tagId: { 
            projectId, 
            tagId 
          }
        }
      });

      res.status(200).json({ 
        message: 'Tag retiré avec succès' 
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return res.status(404).json({ 
            error: 'Tag non trouvé dans ce projet' 
          });
        }
      }

      console.error('Erreur lors du retrait du tag:', error);
      res.status(500).json({ error: 'Erreur lors du retrait du tag' });
    }
  }
};