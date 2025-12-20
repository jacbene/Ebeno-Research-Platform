import { Router } from 'express';
import collaborationController from '../controllers/collaborationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, collaborationController.createCollaborationSession);
router.get('/:id', authMiddleware, collaborationController.getCollaborationSession);
router.put('/:id', authMiddleware, collaborationController.updateCollaborationSession);
router.delete('/:id', authMiddleware, collaborationController.deleteCollaborationSession);

export default router;
