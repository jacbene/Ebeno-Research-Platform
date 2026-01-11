import { Request, Response } from 'express';
import memoService from '../services/memoService.js';

class MemoController {
  async createMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      const result = await memoService.createMemo(req.body, userId);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      res.status(201).json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  async getMemos(req: Request, res: Response) {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        const result = await memoService.getMemos(req.query, userId);
        if (!result.success) {
            return res.status(403).json({ error: result.error });
        }
        res.json(result.data);
    } catch (error: any) {
        res.status(500).json({ error: 'Erreur serveur' });
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
        return res.status(404).json({ error: result.error });
      }
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  async updateMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      const { memoId } = req.params;
      const result = await memoService.updateMemo(memoId, req.body, userId);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      res.json(result.data);
    } catch (error: any) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }

  async deleteMemo(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Non authentifié' });
      }
      const { memoId } = req.params;
      const result = await memoService.deleteMemo(memoId, userId);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
}

export default new MemoController();
