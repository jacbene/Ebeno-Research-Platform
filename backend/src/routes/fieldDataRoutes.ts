// backend/routes/fieldDataRoutes.ts
// URL: /api/field-data
import express from 'express';
import multer from 'multer';
import FieldDataController from '../controllers/fieldDataController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import {
  createFieldNoteSchema,
  updateFieldNoteSchema,
  syncFieldDataSchema
} from '../validators/fieldData.validator';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Appliquer l'authentification
router.use(authMiddleware);

// Routes pour les notes de terrain
router.post('/', validateRequest(createFieldNoteSchema), (req, res) => 
  FieldDataController.createFieldNote(req, res)
);

router.get('/project/:projectId', (req, res) => 
  FieldDataController.getProjectFieldNotes(req, res)
);

router.get('/:id', (req, res) => 
  FieldDataController.getFieldNoteById(req, res)
);

router.put('/:id', validateRequest(updateFieldNoteSchema), (req, res) => 
  FieldDataController.updateFieldNote(req, res)
);

router.delete('/:id', (req, res) => 
  FieldDataController.deleteFieldNote(req, res)
);

// Synchronisation mobile
router.post('/sync', validateRequest(syncFieldDataSchema), (req, res) => 
  FieldDataController.syncFieldData(req, res)
);

// Upload de médias
router.post('/media', upload.single('file'), (req, res) => 
  FieldDataController.uploadMedia(req, res)
);

// Données géographiques
router.get('/project/:projectId/geojson', (req, res) => 
  FieldDataController.getGeospatialData(req, res)
);

export default router;
