// backend/src/server.ts
// ✅ IMPORT SENTRY EN PREMIER (avant tout le reste)
import './instrument';
import * as Sentry from '@sentry/node';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import requestIp from 'request-ip';
import { sanitizeBody } from './middleware/sanitize';
import { auditLogger } from './middleware/auditLogger';
import { startCleanupCron } from './services/cleanupService';
import { verifyEmailConnection } from './services/emailService';
import { startAuditPurgeCron } from './services/auditPurgeService';
import { startAccountDeletionPurgeCron } from './services/accountDeletionService';
// Routes
import uploadRoutes from './routes/uploadRoutes';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import memoRoutes from './routes/memoRoutes';
import projectRoutes from './routes/projectRoutes';
import deepseekRoutes from './routes/deepseekRoutes';
import collaborationRoutes from './routes/collaborationRoutes';
import transcriptionRoutes from './routes/transcriptionRoutes';
import analysisRoutes from './routes/analysisRoutes';
import textRoutes from './routes/textRoutes';
import commentRoutes from './routes/commentRoutes';
import versionRoutes from './routes/versionRoutes';
import projectMembersRoutes from './routes/projectMembersRoutes';
import fileRoutes from './routes/fileRoutes';
import summaryRoutes from './routes/summaryRoutes';
import entityRoutes from './routes/entityRoutes';
import codeRoutes from './routes/codeRoutes';
import activityRoutes from './routes/activityRoutes';
import healthRoutes from './routes/healthRoutes';
import searchRoutes from './routes/searchRoutes';
import statsRoutes from './routes/statsRoutes';
import languageRoutes from './routes/languageRoutes';
import adminRoutes from './routes/adminRoutes';
import twoFactorRoutes from './routes/twoFactorRoutes';
import translationRoutes from './routes/translationRoutes';

// Socket + DB + Services
import { CollaborationSocketHandler } from './sockets/collaborationSocket';
import { setIO } from './socketManager';
import { db } from './db/knex';

// ✅ Middleware de rate limiting
import {
  globalLimiter,
  authLimiter,
  uploadLimiter,
  aiLimiter,
} from './middleware/rateLimiter';

// ✅ Middleware de logs + logger
import { requestLogger } from './middleware/requestLogger';
import { logger, logError } from './utils/logger';
import { invalidateStatsOnWrite } from './middleware/invalidateStatsCache';

// Chargement des variables d'environnement
dotenv.config();

// ============================================================
// GESTION DES ERREURS NON CAPTURÉES
// ============================================================

process.on('uncaughtException', async (err) => {
  logError('❌ Uncaught Exception', err);
  // ✅ Capturer dans Sentry AVANT de mourir
  Sentry.captureException(err);
  await Sentry.close(2000); // 2s pour flush
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logError('❌ Unhandled Rejection', reason, { promise: String(promise) });
  // ✅ Capturer dans Sentry AVANT de mourir
  if (reason instanceof Error) {
    Sentry.captureException(reason);
  } else {
    Sentry.captureMessage(`Unhandled Rejection: ${String(reason)}`, 'error');
  }
  await Sentry.close(2000);
  process.exit(1);
});

// ============================================================
// INITIALISATION EXPRESS
// ============================================================

const app = express();
const port = Number(process.env.PORT) || 5001;

// ✅ Faire confiance au proxy (Render + Cloudflare)
app.set('trust proxy', (ip: string) => {
  if (ip === '127.0.0.1' || ip === '::1') return true;
  if (ip.startsWith('172.') || ip.startsWith('10.') || ip.startsWith('192.168.')) return true;
  return true;
});

const httpServer = createServer(app);

// ============================================================
// SOCKET.IO
// ============================================================

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

new CollaborationSocketHandler(io);
setIO(io);

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(requestLogger);
app.use(requestIp.mw());
app.use('/api', auditLogger);

app.use('/api', (req, res, next) => {
  const excluded = ['/collaboration', '/summaries', '/deepseek'];
  if (excluded.some((p) => req.path.startsWith(p))) return next();
  return sanitizeBody(req, res, next);
});

app.use('/api', invalidateStatsOnWrite);

// ============================================================
// RATE LIMITING
// ============================================================

app.use('/api', globalLimiter);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

app.use('/api/summaries', aiLimiter);
app.use('/api/analysis', aiLimiter);
app.use('/api/entities', aiLimiter);
app.use('/api/codes', aiLimiter);
app.use('/api/translations', aiLimiter); // ✅ AJOUT — 30 req/min max

// ============================================================
// ROUTES
// ============================================================

app.use('/api/health', healthRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deepseek', deepseekRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/projects', projectMembersRoutes);
app.use('/api/versions', versionRoutes);
app.use('/api/projects/:projectId/files', fileRoutes);
app.use('/api/summaries', summaryRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/codes', codeRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/language', languageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/translations', translationRoutes);

// ============================================================
// ROUTES UTILITAIRES
// ============================================================

app.get('/', (req, res) => {
  res.json({
    name: 'Ebeno Research Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      memos: '/api/memos',
      projects: '/api/projects',
      deepseek: '/api/deepseek',
      collaboration: '/api/collaboration',
      activity: '/api/activity',
      health: '/api/health',
      breakers: '/api/health/breakers',
    },
  });
});

// ============================================================
// GESTION 404
// ============================================================
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

// ============================================================
// GESTION D'ERREURS
// ============================================================

// ✅ Sentry : capture toutes les erreurs non gérées
//    (à placer AVANT votre error handler custom)
Sentry.setupExpressErrorHandler(app);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('❌ Erreur serveur', err, {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.id,
  });

  const message = process.env.NODE_ENV === 'production'
    ? 'Erreur interne du serveur'
    : err.message;

  res.status(err.status || 500).json({ error: message });
});

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================
const startServer = async () => {
  try {
    logger.info('⏳ Connexion à la base de données...');
    await db.raw('SELECT 1');
    logger.info('✅ Base de données connectée');

    // ✅ Corriger les noms .ts → .js dans knex_migrations (one-shot)
    try {
      const result = await db.raw(`
        UPDATE knex_migrations 
        SET name = REPLACE(name, '.ts', '.js') 
        WHERE name LIKE '%.ts'
      `);
      const count = (result as any).rowCount || 0;
      if (count > 0) {
        logger.info(`🔧 Migration names fixed: ${count} entries updated (.ts → .js)`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ Could not fix migration names: ${err.message}`);
    }

    logger.info('⏳ Exécution des migrations...');
    await db.migrate.latest();
    logger.info('✅ Migrations appliquées avec succès');

    logger.info(`⏳ Démarrage du serveur sur le port ${port}...`);
    httpServer.listen(port, '0.0.0.0', () => {
      logger.info(`🚀 Serveur démarré sur le port ${port}`);
      logger.info(`📁 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });

    httpServer.on('listening', () => {
      const addr = httpServer.address();
      if (addr && typeof addr !== 'string') {
        logger.info(`✅ Serveur en écoute sur le port ${addr.port}`);
      }
    });

    httpServer.on('error', (err) => {
      logError('❌ Erreur du serveur HTTP', err);
    });

startCleanupCron();
startAuditPurgeCron();
startAccountDeletionPurgeCron(); // ✅ purge RGPD 03:30

    // ✅ Vérifier SMTP (asynchrone, non bloquant)
    verifyEmailConnection()
      .then(() => logger.info('✅ [email] SMTP opérationnel'))
      .catch((err: Error) =>
        logger.warn(
          `⚠️ [email] SMTP indisponible — les emails ne partiront pas: ${err.message || '(timeout)'}`
        )
      );

  } catch (err) {
    logError('❌ Erreur lors du démarrage', err);
    // ✅ Capturer l'erreur fatale de démarrage dans Sentry
    Sentry.captureException(err);
    await Sentry.close(2000);
    process.exit(1);
  }
};

// ✅ Ne pas démarrer le serveur en mode test
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { io };
export default app;
