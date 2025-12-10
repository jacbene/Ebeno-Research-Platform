import express from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Routes CRUD pour les projets
router.get('/', projectController.getUserProjects);
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProjectById);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Routes pour la gestion des membres
router.post('/:id/members', projectController.addMember);
router.delete('/:id/members/:userId', projectController.removeMember);
router.put('/:id/members/:userId', projectController.updateMemberRole);

// Routes pour les tags
router.post('/:id/tags', projectController.addTag);
router.delete('/:id/tags/:tagId', projectController.removeTag);

export default router;