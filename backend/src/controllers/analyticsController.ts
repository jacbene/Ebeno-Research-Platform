import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getProjectAnalytics = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        transcripts: true,
        members: true,
        tags: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    // Calcul des statistiques
    const stats = {
      transcripts: project.transcripts.length,
      members: project.members.length,
      tags: project.tags.length,
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
