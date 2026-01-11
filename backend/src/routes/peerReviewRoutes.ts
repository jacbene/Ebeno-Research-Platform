import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createReviewSchema,
  submitReviewSchema,
} from '../validators/peerReview.validator';
import { 
    createPeerReviewSubmission,
    getReview,
    submitReview,
    getUserReviews
} from '../controllers/peerReviewController';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Créer une nouvelle soumission d'évaluation par les pairs
router.post('/', validateRequest(createReviewSchema), createPeerReviewSubmission);

// Obtenir une évaluation spécifique
router.get('/:id', getReview);

// Soumettre une évaluation pour une soumission
router.post('/:id/submit', validateRequest(submitReviewSchema), submitReview);

// Obtenir toutes les évaluations de l'utilisateur actuel
router.get('/user/reviews', getUserReviews);

export default router;
