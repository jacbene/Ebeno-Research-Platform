import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ProjectRole } from '@prisma/client';

class ProjectController {
  async createProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }
      const { title, description, tags } = req.body;
      if (!title || title.trim().length < 3) {
        return res.status(400).json({ success: false, message: 'Le titre est requis (3 caractères min)' });
      }

      const project = await prisma.project.create({
        data: {
          title: title.trim(),
          description: description?.trim() || '',
          owner: { connect: { id: userId } },
          members: { create: { userId: userId, role: ProjectRole.OWNER } },
          ...(tags && tags.length > 0 && {
            tags: {
              create: tags.map((tagName: string) => ({
                tag: {
                  connectOrCreate: {
                    where: { name_category: { name: tagName.trim(), category: 'user' } },
                    create: { name: tagName.trim(), color: this.generateRandomColor(), category: 'user' },
                  },
                },
              })),
            },
          }),
        },
        include: {
          members: { include: { user: { select: { id: true, profile: true } } } },
          tags: { include: { tag: true } },
        },
      });

      return res.status(201).json({ success: true, data: project, message: 'Projet créé' });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getProjects(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }
      const { search, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const where: any = {
        members: { some: { userId } },
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
            members: { include: { user: { select: { profile: true } } } },
            tags: { include: { tag: true } },
            _count: { select: { documents: true, transcriptions: true, memos: true, codes: true } },
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
          pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } 
      });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const project = await prisma.project.findFirst({
        where: { id, members: { some: { userId } } },
        include: {
          members: { include: { user: { select: { id: true, email: true, profile: true } } } },
          tags: { include: { tag: true } },
          documents: { take: 10, orderBy: { createdAt: 'desc' } },
          transcriptions: { take: 10, orderBy: { createdAt: 'desc' } },
          memos: {
            take: 10,
            orderBy: { updatedAt: 'desc' },
            include: { user: { select: { profile: true } } },
          },
          _count: { select: { documents: true, transcriptions: true, memos: true, codes: true } },
        },
      });

      if (!project) {
        return res.status(404).json({ success: false, message: 'Projet non trouvé' });
      }

      return res.status(200).json({ success: true, data: project });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }
  
  async updateProject(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { title, description } = req.body;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const projectMember = await prisma.projectMember.findFirst({ 
          where: { projectId: id, userId, role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] } } 
      });
      if (!projectMember) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description.trim() }),
        },
        include: {
            members: { include: { user: { select: { profile: true } } } },
            tags: { include: { tag: true } },
        },
      });

      return res.status(200).json({ success: true, data: project, message: 'Projet mis à jour' });
    } catch (error: any) {
      console.error('Error:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async deleteProject(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const projectMember = await prisma.projectMember.findFirst({
            where: { projectId: id, userId, role: ProjectRole.OWNER },
        });
        if (!projectMember) {
            return res.status(403).json({ success: false, message: 'Seul le propriétaire peut supprimer ce projet' });
        }

        await prisma.project.delete({ where: { id } });

        return res.status(200).json({ success: true, message: 'Projet supprimé' });
    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async addTag(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id: projectId } = req.params;
      const { name, color } = req.body;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const member = await prisma.projectMember.findFirst({ where: { projectId, userId } });
      if (!member) {
        return res.status(403).json({ success: false, message: 'Non autorisé' });
      }

      const tag = await prisma.tag.upsert({
        where: { name_category: { name: name.trim(), category: 'user' } },
        update: { color: color || undefined },
        create: { name: name.trim(), color: color || this.generateRandomColor(), category: 'user' },
      });

      const projectTag = await prisma.projectTag.create({
        data: { projectId, tagId: tag.id },
        include: { tag: true },
      });

      return res.status(201).json({ success: true, data: projectTag.tag });
    } catch (error: any) {
        console.error('Error:', error);
        // Handle unique constraint violation gracefully
        if (error.code === 'P2002') {
            return res.status(409).json({ success: false, message: 'Ce tag est déjà associé au projet' });
        }
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async removeTag(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id: projectId, tagId } = req.params;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Non authentifié' });
        }

        const member = await prisma.projectMember.findFirst({
            where: { projectId, userId, role: { in: [ProjectRole.OWNER, ProjectRole.EDITOR] } },
        });
        if (!member) {
            return res.status(403).json({ success: false, message: 'Non autorisé' });
        }

        await prisma.projectTag.delete({
            where: { projectId_tagId: { projectId, tagId } },
        });

        return res.status(200).json({ success: true, message: 'Tag retiré du projet' });
    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }
  
  private generateRandomColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const projectController = new ProjectController();
