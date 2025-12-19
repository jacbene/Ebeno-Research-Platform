import { Request, Response } from 'express';
import visualizationService from '../services/visualizationService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class VisualizationController {
  // === FRÉQUENCE DES CODES ===
  
  async getCodeFrequencies(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { 
        codeIds,
        startDate,
        endDate,
      } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        codeIds: codeIds ? (codeIds as string).split(',') : undefined,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const result = await visualizationService.getCodeFrequencies(filter);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get code frequencies error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des fréquences' });
    }
  }

  // === NUAGE DE MOTS ===
  
  async getWordCloud(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { 
        startDate,
        endDate,
        maxWords,
        minWordLength,
        excludeCommonWords,
      } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const options = {
        maxWords: maxWords ? parseInt(maxWords as string) : undefined,
        minWordLength: minWordLength ? parseInt(minWordLength as string) : undefined,
        excludeCommonWords: excludeCommonWords !== 'false',
      };

      const result = await visualizationService.getWordCloud(filter, options);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get word cloud error:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du nuage de mots' });
    }
  }

  // === MATRICE DE CO-OCCURRENCE ===
  
  async getCoOccurrenceMatrix(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { startDate, endDate } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const result = await visualizationService.getCoOccurrenceMatrix(filter);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get co-occurrence matrix error:', error);
      res.status(500).json({ error: 'Erreur lors de la génération de la matrice de co-occurrence' });
    }
  }

  // === ÉVOLUTION TEMPORELLE ===
  
  async getTemporalEvolution(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { 
        startDate,
        endDate,
        interval = 'month',
      } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const result = await visualizationService.getTemporalEvolution(
        filter,
        interval as 'day' | 'week' | 'month'
      );
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get temporal evolution error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'évolution temporelle' });
    }
  }

  // === COMPARAISON PAR UTILISATEUR ===
  
  async getUserComparison(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { startDate, endDate } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      const result = await visualizationService.getUserComparison(filter);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get user comparison error:', error);
      res.status(500).json({ error: 'Erreur lors de la comparaison par utilisateur' });
    }
  }

  // === VISUALISATIONS COMBINÉES ===
  
  async getProjectVisualizations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { startDate, endDate } = req.query;

      // Vérifier que l'utilisateur a accès au projet
      const projectMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId,
        },
      });

      if (!projectMember) {
        return res.status(403).json({ error: 'Non autorisé à accéder à ce projet' });
      }

      const filter = {
        projectId,
        dateRange: startDate && endDate ? {
          start: new Date(startDate as string),
          end: new Date(endDate as string),
        } : undefined,
      };

      // Récupérer toutes les visualisations en parallèle
      const [
        frequencies,
        wordCloud,
        coOccurrence,
        temporal,
        userComparison,
      ] = await Promise.all([
        visualizationService.getCodeFrequencies(filter),
        visualizationService.getWordCloud(filter),
        visualizationService.getCoOccurrenceMatrix(filter),
        visualizationService.getTemporalEvolution(filter),
        visualizationService.getUserComparison(filter),
      ]);

      const result = {
        success: true,
        data: {
          frequencies: frequencies.success ? frequencies.data : null,
          wordCloud: wordCloud.success ? wordCloud.data : null,
          coOccurrence: coOccurrence.success ? coOccurrence.data : null,
          temporal: temporal.success ? temporal.data : null,
          userComparison: userComparison.success ? userComparison.data : null,
        },
      };

      res.json(result.data);
    } catch (error: any) {
      console.error('Get project visualizations error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des visualisations' });
    }
  }
}

export default new VisualizationController();
