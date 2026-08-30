import { Router } from 'express';
import {
  createSurvey,
  getSurvey,
  getProjectSurveys,
  updateSurvey,
  deleteSurvey,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  submitResponse,
  getSurveyResponses
} from '../controllers/surveyController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Routes des enquêtes
router.post('/', authenticate, createSurvey);
router.get('/project/:projectId', authenticate, getProjectSurveys);
router.get('/:id', authenticate, getSurvey);
router.put('/:id', authenticate, updateSurvey);
router.delete('/:id', authenticate, deleteSurvey);

// Routes des questions
router.post('/:id/questions', authenticate, addQuestion);
router.put('/:id/questions/:questionId', authenticate, updateQuestion);
router.delete('/:id/questions/:questionId', authenticate, deleteQuestion);

// Routes des réponses
router.post('/:id/responses', authenticate, submitResponse);
router.get('/:id/responses', authenticate, getSurveyResponses);

export default router;
