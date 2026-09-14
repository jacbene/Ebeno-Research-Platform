// backend/src/routes/healthRoutes.ts
import { Router } from 'express';
import { getBreakersStatus } from '../services/circuitBreaker';

const router = Router();

/**
 * ✅ Route racine : /api/health
 */
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ebeno API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * ✅ Route : /api/health/breakers
 * Retourne l'état des circuit breakers (OpenAI, Deepgram, etc.)
 */
router.get('/breakers', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    breakers: getBreakersStatus(),
  });
});

export default router;
