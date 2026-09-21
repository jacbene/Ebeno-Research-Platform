// backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { backupCloudinary, dbInfo } from '../controllers/adminController';

const router = Router();

// ⚠️ Routes protégées par header x-admin-token (pas par JWT)
router.get('/backup/cloudinary', backupCloudinary);
router.get('/backup/db-info', dbInfo);

export default router;
