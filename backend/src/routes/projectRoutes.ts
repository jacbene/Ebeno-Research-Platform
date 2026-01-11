import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);          
router.get('/', projectController.getProjects);                           
router.post('/', projectController.createProject);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);                   
router.post('/:id/tags', projectController.addTag);
router.delete('/:id/tags/:tagId', projectController.removeTag);

export default router;
