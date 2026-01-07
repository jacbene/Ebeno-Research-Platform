import express from 'express';
import ReferenceController from '../controllers/referenceController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  createReferenceSchema, 
  updateReferenceSchema 
} from '../validators/reference.validator';

const router = express.Router();

// Appliquer l'authentification à toutes les routes
router.use(authMiddleware);

// Routes CRUD
router.post('/', validateRequest(createReferenceSchema), ReferenceController.createReference);
router.get('/', ReferenceController.searchReferences);
router.get('/:id', ReferenceController.getReferenceById);
router.put('/:id', validateRequest(updateReferenceSchema), ReferenceController.updateReference);
router.delete('/:id', ReferenceController.deleteReference);

// Import BibTeX (sans validation spécifique pour l'instant)
router.post('/import/:projectId', ReferenceController.importReferences);

// Sous-ressources
router.get('/:id/attachments', async (req, res) => {
  // Gérer les pièces jointes
  res.status(200).json({ message: 'Not implemented yet' });
});

router.post('/:id/attachments', async (req, res) => {
  // Ajouter une pièce jointe
  res.status(200).json({ message: 'Not implemented yet' });
});

export default router;
