import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ReferenceController {
  async createReference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { projectId, ...refData } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }
      if (!refData.title || !refData.author || !refData.year || !projectId) {
        return res.status(400).json({ message: 'Champs requis manquants' });
      }

      const member = await prisma.projectMember.findFirst({ where: { projectId, userId } });
      if (!member) {
        return res.status(403).json({ message: 'Accès non autorisé au projet' });
      }

      const reference = await prisma.reference.create({
        data: {
          ...refData,
          year: parseInt(refData.year),
          project: { connect: { id: projectId } },
          user: { connect: { id: userId } },
        },
      });

      res.status(201).json({ success: true, data: reference });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async searchReferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { query = '', projectId, yearFrom, yearTo, page = 1, limit = 20 } = req.query;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      const where: any = {
        project: { members: { some: { userId } } },
      };

      if (projectId) {
        where.projectId = projectId as string;
      }

      if (query) {
        const searchString = query as string;
        where.OR = [
          { title: { contains: searchString, mode: 'insensitive' } },
          { author: { contains: searchString, mode: 'insensitive' } },
          { journal: { contains: searchString, mode: 'insensitive' } },
        ];
      }
      
      if (yearFrom || yearTo) {
          where.year = {
              ...(yearFrom && { gte: parseInt(yearFrom as string) }),
              ...(yearTo && { lte: parseInt(yearTo as string) }),
          };
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [references, total] = await Promise.all([
        prisma.reference.findMany({
          where,
          include: { project: { select: { id: true, title: true } } },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
        prisma.reference.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: references,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async getReferenceById(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      const reference = await prisma.reference.findUnique({ 
          where: { id },
          include: { project: true } 
      });

      if (!reference) {
        return res.status(404).json({ success: false, message: 'Référence non trouvée' });
      }

      const member = await prisma.projectMember.findFirst({ where: { projectId: reference.projectId, userId } });
      if (!member) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé' });
      }

      res.status(200).json({ success: true, data: reference });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async updateReference(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const data = req.body;

        if (!userId) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        const existingRef = await prisma.reference.findUnique({ where: { id } });
        if (!existingRef) {
            return res.status(404).json({ success: false, message: 'Référence non trouvée' });
        }

        const member = await prisma.projectMember.findFirst({
            where: { projectId: existingRef.projectId, userId, role: { in: ['OWNER', 'EDITOR'] } },
        });
        if (!member) {
            return res.status(403).json({ success: false, message: 'Action non autorisée' });
        }

        if (data.year) data.year = parseInt(data.year);

        const updatedRef = await prisma.reference.update({
            where: { id },
            data,
        });

        res.status(200).json({ success: true, data: updatedRef });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }

  async deleteReference(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Non authentifié' });
      }

      const existingRef = await prisma.reference.findUnique({ where: { id } });
      if (!existingRef) {
        return res.status(404).json({ success: false, message: 'Référence non trouvée' });
      }

      const member = await prisma.projectMember.findFirst({
        where: { projectId: existingRef.projectId, userId, role: { in: ['OWNER', 'EDITOR'] } },
      });
      if (!member) {
        return res.status(403).json({ success: false, message: 'Action non autorisée' });
      }

      await prisma.reference.delete({ where: { id } });

      res.status(200).json({ success: true, message: 'Référence supprimée' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  }
}