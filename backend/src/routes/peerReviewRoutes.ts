import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createReviewSchema,
  updateReviewSchema,
  submitReviewSchema,
} from '../validators/peerReview.validator';
import * as PeerReviewController from '../controllers/peerReviewController';

const router = Router();

router.use(authMiddleware);

router.post('/', validateRequest(createReviewSchema), PeerReviewController.createReview);
router.get('/:id', PeerReviewController.getReview);
router.put('/:id', validateRequest(updateReviewSchema), PeerReviewController.updateReview);
router.delete('/:id', PeerReviewController.deleteReview);
router.post('/:id/submit', validateRequest(submitReviewSchema), PeerReviewController.submitReview);

export default router;
