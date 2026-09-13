import { Router } from 'express';
import { getBreakersStatus } from '../services/circuitBreaker';

const router = Router();

router.get('/breakers', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    breakers: getBreakersStatus(),
  });
});

export default router;
