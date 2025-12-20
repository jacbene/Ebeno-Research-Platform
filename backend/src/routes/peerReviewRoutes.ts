import { Router } from 'express';
import { createPeerReview, getPeerReview, updatePeerReview, deletePeerReview } from '../controllers/peerReviewController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createPeerReview);
router.get('/:id', authMiddleware, getPeerReview);
router.put('/:id', authMiddleware, updatePeerReview);
router.delete('/:id', authMiddleware, deletePeerReview);

export default router;
