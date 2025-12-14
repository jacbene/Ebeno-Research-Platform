
import { Request, Response } from 'express';
import codingService from '../services/codingService';

class CodingController {
  // === CODES ===
  
  async createCode(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { name, description, color, parentId } = req.body;
      const { projectId } = req.params;

      if (!name || !projectId) {
        return res.status(400).json({ error: 'Le nom du code et l\'ID du projet sont requis' });
      }

      const result = await codingService.createCode({
        name,
        description,
        color,
        projectId,
        parentId,
        userId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Create code error:', error);
      res.status(500).json({ error: 'Erreur lors de la création du code' });
    }
  }

  async getProjectCodes(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;

      const result = await codingService.getProjectCodes(projectId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get codes error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des codes' });
    }
  }

  async getCodeTree(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;

      const result = await codingService.getCodeTree(projectId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get code tree error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'arbre des codes' });
    }
  }

  async updateCode(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { codeId } = req.params;
      const { name, description, color, parentId } = req.body;

      const result = await codingService.updateCode(codeId, {
        name,
        description,
        color,
        parentId,
      }, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Update code error:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du code' });
    }
  }

  async deleteCode(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { codeId } = req.params;

      const result = await codingService.deleteCode(codeId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: result.message });
    } catch (error: any) {
      console.error('Delete code error:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du code' });
    }
  }

  // === ANNOTATIONS ===
  
  async createAnnotation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const {
        codeId,
        documentId,
        transcriptionId,
        startIndex,
        endIndex,
        selectedText,
        notes,
      } = req.body;

      if (!codeId || !selectedText || startIndex === undefined || endIndex === undefined) {
        return res.status(400).json({ 
          error: 'Le code, le texte sélectionné et les positions sont requis' 
        });
      }

      if (!documentId && !transcriptionId) {
        return res.status(400).json({ 
          error: 'Une annotation doit être liée à un document ou une transcription' 
        });
      }

      const result = await codingService.createAnnotation({
        codeId,
        documentId,
        transcriptionId,
        startIndex: parseInt(startIndex),
        endIndex: parseInt(endIndex),
        selectedText,
        notes,
        userId,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json(result.data);
    } catch (error: any) {
      console.error('Create annotation error:', error);
      res.status(500).json({ error: 'Erreur lors de la création de l\'annotation' });
    }
  }

  async getDocumentAnnotations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { documentId } = req.params;

      const result = await codingService.getDocumentAnnotations(documentId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get document annotations error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annotations' });
    }
  }

  async getTranscriptAnnotations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { transcriptionId } = req.params;

      const result = await codingService.getTranscriptAnnotations(transcriptionId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get transcript annotations error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annotations' });
    }
  }

  async getCodeAnnotations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { codeId } = req.params;

      const result = await codingService.getCodeAnnotations(codeId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get code annotations error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des annotations du code' });
    }
  }

  async deleteAnnotation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { annotationId } = req.params;

      const result = await codingService.deleteAnnotation(annotationId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ message: result.message });
    } catch (error: any) {
      console.error('Delete annotation error:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression de l\'annotation' });
    }
  }

  // === STATISTIQUES ===
  
  async getCodingStatistics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;

      const result = await codingService.getCodingStatistics(projectId, userId);
      
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result.data);
    } catch (error: any) {
      console.error('Get coding statistics error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
    }
  }

  // === ANALYSE ASSISTÉE PAR IA ===
  
  async suggestCodes(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }

      const { projectId } = req.params;
      const { text, existingCodes } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Le texte à analyser est requis' });
      }

      // Utiliser l'IA DeepSeek pour suggérer des codes
      // (Cette partie sera implémentée plus tard avec l'intégration IA)
      res.json({ 
        message: 'Fonctionnalité d\'analyse IA à venir',
        suggestions: [] 
      });
    } catch (error: any) {
      console.error('Suggest codes error:', error);
      res.status(500).json({ error: 'Erreur lors de la génération des suggestions' });
    }
  }
}

export default new CodingController();
