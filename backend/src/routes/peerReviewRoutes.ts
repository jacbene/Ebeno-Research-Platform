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

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD de base
router.post('/', validateRequest(createReviewSchema), PeerReviewController.createReview);
router.get('/:id', PeerReviewController.getReview);
router.put('/:id', validateRequest(updateReviewSchema), PeerReviewController.updateReview);
router.delete('/:id', PeerReviewController.deleteReview);
router.post('/:id/submit', validateRequest(submitReviewSchema), PeerReviewController.submitReview);

// Routes supplémentaires pour les fonctionnalités avancées
router.get('/user/reviews', PeerReviewController.getUserReviews);
router.get('/user/stats', PeerReviewController.getReviewStats);

export default router;
