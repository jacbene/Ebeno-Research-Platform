import { Router } from 'express';
import memoController from '../controllers/memoController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes CRUD
router.post('/', memoController.createMemo);
router.get('/', memoController.getMemos); // Peut être filtré par projectId avec ?projectId=...
router.get('/:id', memoController.getMemo);
router.put('/:id', memoController.updateMemo);
router.delete('/:id', memoController.deleteMemo);

export default router;
