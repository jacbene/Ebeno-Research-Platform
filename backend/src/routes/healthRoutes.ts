// backend/src/routes/healthRoutes.ts
import { Router, Request, Response } from 'express';
import { getBreakersStatus } from '../services/circuitBreaker';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

const router = Router();

// ============================================================
// /api/health — Liveness (le process est-il vivant ?)
// ============================================================

router.get('/', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    message: 'Ebeno API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// ============================================================
// /api/health/db — Test DB + latence
// ============================================================

router.get('/db', async (req: Request, res: Response) => {
  const start = Date.now();
  try {
    await db.raw('SELECT 1');
    const latencyMs = Date.now() - start;

    res.json({
      status: 'OK',
      database: 'connected',
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    logger.error('❌ [health/db] DB inaccessible:', error);

    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected',
      latencyMs,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================
// /api/health/ready — Readiness (prêt à recevoir du trafic ?)
// ============================================================
//
// Contrôles effectués :
//   - DB accessible et rapide (< 2s)
//
// Comportement :
//   - 200 si tout est OK
//   - 503 si un composant critique est indisponible
//     → Render retirera l'instance du load balancer
//

router.get('/ready', async (req: Request, res: Response) => {
  const checks: Record<string, any> = {};
  let isReady = true;

  // Check DB
  const dbStart = Date.now();
  try {
    await db.raw('SELECT 1');
    checks.db = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (error: any) {
    checks.db = { ok: false, error: error.message };
    isReady = false;
  }

  // Check uptime minimal (> 5s → le serveur a fini de démarrer)
  const uptime = process.uptime();
  checks.uptime = { ok: uptime > 5, seconds: Math.floor(uptime) };
  if (uptime <= 5) isReady = false;

  res.status(isReady ? 200 : 503).json({
    ready: isReady,
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// /api/health/breakers — État des circuit breakers
// ============================================================

router.get('/breakers', (req: Request, res: Response) => {
  res.json({
    timestamp: new Date().toISOString(),
    breakers: getBreakersStatus(),
  });
});

export default router;
