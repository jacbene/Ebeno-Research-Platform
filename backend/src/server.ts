// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

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

// Socket + DB
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

// Chargement des variables d'environnement
dotenv.config();

// Gestion des erreurs non capturées
process.on('uncaughtException', (err) => {
  logError('❌ Uncaught Exception', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('❌ Unhandled Rejection', reason, { promise: String(promise) });
  process.exit(1);
});

const app = express();
const port = Number(process.env.PORT) || 5001;

// ✅ Faire confiance au proxy (nécessaire pour rate limiting sur Render)
app.set('trust proxy', 1);

const httpServer = createServer(app);

// Configurer Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

new CollaborationSocketHandler(io);
setIO(io); // ✅ Enregistrer IO pour les contrôleurs

// ============================================================
// MIDDLEWARES
// ============================================================

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ Logs de requêtes HTTP (avant les routes)
app.use(requestLogger);

// ============================================================
// RATE LIMITING
// ============================================================

// Limiteur global (100 req/min)
app.use('/api', globalLimiter);

// Limiteurs spécifiques (AVANT les routes concernées)
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/upload', uploadLimiter);

// Limiteur IA (résumés, analyse, entités, codes)
app.use('/api/summaries', aiLimiter);
app.use('/api/analysis', aiLimiter);
app.use('/api/entities', aiLimiter);
app.use('/api/codes', aiLimiter);

// ============================================================
// ROUTES
// ============================================================

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

// ============================================================
// ROUTES UTILITAIRES
// ============================================================

// Route de santé
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ebeno API' });
});

// Route racine
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
      health: '/api/health',
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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logError('❌ Erreur serveur', err, {
    method: req.method,
    url: req.originalUrl,
    userId: (req as any).user?.id,
  });

  // Ne pas exposer les détails en production
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
      } else {
        logger.info('✅ Serveur en écoute (adresse non numérique)');
      }
    });

    httpServer.on('error', (err) => {
      logError('❌ Erreur du serveur HTTP', err);
    });
  } catch (err) {
    logError('❌ Erreur lors du démarrage', err);
    process.exit(1);
  }
};

startServer();

export { io };
export default app;
