import express from 'express';
import visualizationController from '../controllers/visualizationController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// === VISUALISATIONS SPÉCIFIQUES ===
router.get('/projects/:projectId/visualizations/frequencies', visualizationController.getCodeFrequencies);
router.get('/projects/:projectId/visualizations/word-cloud', visualizationController.getWordCloud);
router.get('/projects/:projectId/visualizations/co-occurrence', visualizationController.getCoOccurrenceMatrix);
router.get('/projects/:projectId/visualizations/temporal', visualizationController.getTemporalEvolution);
router.get('/projects/:projectId/visualizations/user-comparison', visualizationController.getUserComparison);

// === TOUTES LES VISUALISATIONS ===
router.get('/projects/:projectId/visualizations', visualizationController.getProjectVisualizations);

export default router;
