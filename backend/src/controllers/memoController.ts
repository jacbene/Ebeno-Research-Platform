import { Request, Response } from 'express';
import memoService from '../services/memoService.js';

class MemoController {
  // === CRÉATION ===
  
  async createMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const {
        title,
        content,
        projectId,
        codeId,
        documentId,
        transcriptionId,
        annotationId,
      } = req.body;

      if (!title || !content || !projectId) {
        return res.status(400).json({ 
          error: 'Le titre, le contenu et l\'ID du projet sont requis' 
        });
      }

      const result = await memoService.createMemo({
        title,
        content,
        projectId,
        codeId,
        documentId,
        transcriptionId,
        annotationId,
        userId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Create memo error:', error);
      res.status(500).json({ error: 'Erreur lors de la création du mémo' });
    }
  }

  // === LECTURE ===
  
  async getMemos(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const {
        projectId,
        codeId,
        documentId,
        transcriptionId,
        annotationId,
        search,
      } = req.query;

      const filter = {
        projectId: projectId as string,
        codeId: codeId as string,
        documentId: documentId as string,
        transcriptionId: transcriptionId as string,
        annotationId: annotationId as string,
        userId: req.query.userId as string,
        search: search as string,
      };

      const result = await memoService.getMemos(filter);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get memos error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des mémos' });
    }
  }

  async getMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { memoId } = req.params;

      const result = await memoService.getMemoById(memoId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get memo error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du mémo' });
    }
  }

  async getProjectMemos(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { search } = req.query;

      const result = await memoService.getMemos({
        projectId,
        search: search as string,
      });
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get project memos error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des mémos du projet' });
    }
  }

  // === MISE À JOUR ===
  
  async updateMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { memoId } = req.params;
      const {
        title,
        content,
        codeId,
        documentId,
        transcriptionId,
        annotationId,
      } = req.body;

      const result = await memoService.updateMemo(memoId, {
        title,
        content,
        codeId,
        documentId,
        transcriptionId,
        annotationId,
      }, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Update memo error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du mémo' });
    }
  }

  // === SUPPRESSION ===
  
  async deleteMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { memoId } = req.params;

      const result = await memoService.deleteMemo(memoId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: result.message });
    } catch (error: any) {
      console.error('Delete memo error:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du mémo' });
    }
  }

  // === STATISTIQUES ===
  
  async getMemoStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;

      const result = await memoService.getMemoStatistics(projectId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get memo statistics error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

  // === RECHERCHE ===
  
  async searchMemos(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Terme de recherche requis' });
      }

      const result = await memoService.searchMemos(projectId, q, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Search memos error:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des mémos' });
    }
  }

  // === IA ===
  
  async generateMemoWithAI(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { context } = req.body;

      const result = await memoService.generateMemoWithAI(projectId, context, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Generate memo with AI error:', error);
      res.status(500).json({ error: 'Erreur lors de la génération du mémo avec IA' });
    }
  }
}

export default new MemoController();
