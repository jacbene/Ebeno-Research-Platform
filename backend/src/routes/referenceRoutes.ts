import express from 'express';
import { ReferenceController } from '../controllers/referenceController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createReferenceSchema, 
  updateReferenceSchema 
} from '../validators/reference.validator';

const router = express.Router();
const referenceController = new ReferenceController();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD
router.post('/', validateRequest(createReferenceSchema), referenceController.createReference);
router.get('/', referenceController.searchReferences);
router.get('/:id', referenceController.getReferenceById);
router.put('/:id', validateRequest(updateReferenceSchema), referenceController.updateReference);
router.delete('/:id', referenceController.deleteReference);

export default router;
