import { Router } from 'express';
const projectController = require('../controllers/projectController');
const authMiddleware = require('../middleware/auth');

const router = Router();

router.use(authMiddleware.authMiddleware);

router.get('/', projectController.projectController.getProjects);
router.post('/', projectController.projectController.createProject);
router.get('/:id', projectController.projectController.getProject);
router.put('/:id', projectController.projectController.updateProject);
router.delete('/:id', projectController.projectController.deleteProject);
router.post('/:id/members', projectController.projectController.addMember);
router.delete('/:id/members/:userId', projectController.projectController.removeMember);
router.post('/:id/tags', projectController.projectController.addTag);
router.delete('/:id/tags/:tagId', projectController.projectController.removeTag);

export default router;
