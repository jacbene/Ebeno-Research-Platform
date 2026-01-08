import { Router } from 'express';
import collaborationController from '../controllers/collaborationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD (corrigées)
router.post('/', collaborationController.createCollaboration); // Changé de createCollaborationSession
router.get('/', collaborationController.getCollaborations); // Nouvelle route pour lister toutes les collaborations
router.get('/:id', collaborationController.getCollaboration); // Changé de getCollaborationSession
router.put('/:id', collaborationController.updateCollaboration); // Changé de updateCollaborationSession
router.delete('/:id', collaborationController.deleteCollaboration); // Changé de deleteCollaborationSession

// Gestion des membres (à ajouter si besoin)
router.post('/:id/members', collaborationController.addMember);
router.delete('/:id/members/:memberId', collaborationController.removeMember);
router.put('/:id/members/:memberId/role', collaborationController.updateMemberRole);

// Statistiques (à ajouter si besoin)
router.get('/:id/stats', collaborationController.getCollaborationStats);

export default router;
