import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';

// Import des routes
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import deepseekRoutes from './routes/deepseekRoutes';
import transcriptionRoutes from './routes/transcriptionRoutes';
import codingRoutes from './routes/codingRoutes';
import userRoutes from './routes/userRoutes';
import memoRoutes from './routes/memoRoutes';
import visualizationRoutes from './routes/visualizationRoutes';

// Import de la configuration
import { config } from './config/env';

// Initialisation
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = config.port || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deepseek', deepseekRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visualizations', visualizationRoutes);

// Documentation Swagger (conditionnelle selon l'environnement)
if (config.env === 'development') {
  try {
    const { swaggerSpec, swaggerUiOptions } = require('./swagger/swagger.config');
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
    
    app.get('/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });
  } catch (error) {
    console.warn('⚠️  Swagger non configuré. Pour activer, installez swagger-ui-express et swagger-jsdoc');
  }
}

// Routes de santé
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Ebeno Research Platform API',
    timestamp: new Date().toISOString(),
    environment: config.env,
    services: {
      deepseek: '/api/deepseek/health',
    },
  });
});

// Route racine
app.get('/', (req, res) => {
  res.json({
    name: 'Ebeno Research Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      projects: '/api/projects',
      deepseek: '/api/deepseek',
      health: '/api/health',
    },
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl,
  });
});

// Gestionnaire d'erreurs global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Erreur serveur:', err.stack);
  
  const statusCode = err.statusCode || 500;
  const message = config.env === 'production' 
    ? 'Erreur interne du serveur'
    : err.message;
    
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(config.env === 'development' && { stack: err.stack }),
  });
});

// Création du serveur HTTP et Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
});

// Initialiser les gestionnaires de socket (conditionnel)
if (config.env === 'development') {
  try {
    const { CollaborationSocketHandler } = require('./sockets/collaborationSocket');
    new CollaborationSocketHandler(io);
    console.log('✅ Socket.IO collaboration activé');
  } catch (error) {
    console.warn('⚠️  CollaborationSocketHandler non disponible. Pour activer, créez le fichier collaborationSocket.ts');
  }
}

// Démarrer le serveur
httpServer.listen(port, () => {
  console.log(`✅ Serveur démarré sur le port ${port}`);
  console.log(`📁 Environnement: ${config.env}`);
  console.log(`🌐 Frontend URL: ${config.cors.origin}`);
  console.log(`📚 Documentation: ${config.env === 'development' ? `http://localhost:${port}/docs` : 'Désactivée en production'}`);
});

export default app;
