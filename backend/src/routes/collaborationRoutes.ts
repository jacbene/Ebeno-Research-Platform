import { Router } from 'express';
import collaborationController from '../controllers/collaborationController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD
router.post('/', collaborationController.createCollaboration);
router.get('/project/:projectId', collaborationController.getCollaborationsByProject);
router.get('/:id', collaborationController.getCollaborationById);
router.put('/:id', collaborationController.updateCollaborationContent);
router.delete('/:id', collaborationController.deleteCollaboration);

// Gestion des participants
router.post('/:id/participants', collaborationController.manageCollaborationParticipants);

// Historique et curseurs
router.get('/:id/history', collaborationController.getCollaborationHistory);
router.get('/:id/cursors', collaborationController.getCollaborationCursors);


export default router;
