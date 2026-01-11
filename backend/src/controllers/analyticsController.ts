import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getProjectAnalytics = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            transcriptions: true,
            members: true, // Corrected from projectMemberships
            tags: true,
            memos: true,
            documents: true
          }
        }
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    // The _count property is now correctly typed
    const stats = {
      transcriptions: project._count.transcriptions,
      members: project._count.members, // Corrected from projectMemberships
      tags: project._count.tags,
      memos: project._count.memos,
      documents: project._count.documents,
      latestActivity: project.updatedAt,
    };

    res.json(stats);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

export const getTeamAnalytics = async (req: Request, res: Response) => {
  try {
    const teamStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        id: true,
      },
    });

    res.json(teamStats);
  } catch (error) {
    console.error('Team analytics error:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
