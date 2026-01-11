// backend/routes/index.ts
// Mettre à jour pour inclure les nouvelles routes
import express from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import projectRoutes from './projectRoutes';
import codingRoutes from './codingRoutes';
import memoRoutes from './memoRoutes';
import transcriptionRoutes from './transcriptionRoutes';
import deepseekRoutes from './deepseekRoutes';
import visualizationRoutes from './visualizationRoutes';
import referenceRoutes from './referenceRoutes';
import surveyRoutes from './surveyRoutes';
import fieldDataRoutes from './fieldDataRoutes';
import collaborationRoutes from './collaborationRoutes';
import peerReviewRoutes from './peerReviewRoutes';
import analyticsRoutes from './analyticsRoutes';
import writingAssistantRoutes from './writingAssistantRoutes';


const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/coding', codingRoutes);
router.use('/memos', memoRoutes);
router.use('/transcriptions', transcriptionRoutes);
router.use('/deepseek', deepseekRoutes);
router.use('/visualizations', visualizationRoutes);
router.use('/references', referenceRoutes);
router.use('/surveys', surveyRoutes);
router.use('/field-data', fieldDataRoutes);
router.use('/collaboration', collaborationRoutes);
router.use('/peer-review', peerReviewRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/writing-assistant', writingAssistantRoutes);


export default router;
