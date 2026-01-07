import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', ProjectController.getProjects);
router.post('/', ProjectController.createProject);
router.get('/:id', ProjectController.getProject);
router.put('/:id', ProjectController.updateProject);
router.delete('/:id', ProjectController.deleteProject);
router.post('/:id/members', ProjectController.addMember);
router.delete('/:id/members/:userId', ProjectController.removeMember);
router.post('/:id/tags', ProjectController.addTag);
router.delete('/:id/tags/:tagId', ProjectController.removeTag);

export default router;
