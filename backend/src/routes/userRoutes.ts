import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { exportMyData, getExportInfo } from '../controllers/gdprController';

const router = Router();

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
// ✅ Routes RGPD (authentifiées)
router.get('/me/export-info', authenticate, getExportInfo);
router.get('/me/export-data', authenticate, exportMyData);

export default router;
