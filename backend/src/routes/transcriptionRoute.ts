import express from 'express';
import multer from 'multer';
import { transcriptionController } from '../controllers/transcriptionController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
const upload = multer({ 
  dest: 'uploads/tmp/',
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/webm',
      'audio/ogg',
      'audio/x-m4a',
      'audio/flac',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes pour les transcriptions
router.post('/upload', upload.single('file'), transcriptionController.uploadTranscription);
router.get('/:id', transcriptionController.getTranscription);
router.get('/:id/progress', transcriptionController.getTranscriptionProgress);
router.get('/user/list', transcriptionController.getUserTranscriptions);
router.delete('/:id', transcriptionController.deleteTranscription);

export default router;
