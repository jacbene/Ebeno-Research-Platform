import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import visualizationRoutes from './routes/visualizationRoutes';
import memoRoutes from './routes/memoRoutes';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
// Initialiser les gestionnaires de socket
import { CollaborationSocketHandler } from './sockets/collaborationSocket';
new CollaborationSocketHandler(io);
import { swaggerSpec, swaggerUiOptions } from './swagger/swagger.config';
import swaggerUi from 'swagger-ui-express';


dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import des routes
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import deepseekRoutes from './routes/deepseekRoutes';
import transcriptionRoutes from './routes/transcriptionRoute';
import codingRoutes from './routes/codingRoutes';
import userRoutes from './routes/userRoutes'; // Ajout de la nouvelle route

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/deepseek', deepseekRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/coding', codingRoutes);
app.use('/api/memos', memoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/visualizations', visualizationRoutes);
// Documentation Swagger
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// JSON brut de la spécification
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Routes de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ebeno Research Platform API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    services: {
      deepseek: '/api/deepseek/health'
    }
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
      health: '/api/health'
    }
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route non trouvée',
    path: req.originalUrl 
  });
});

// Gestionnaire d'erreurs global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Erreur serveur:', err.stack);
  
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Démarrer le serveur
httpServer.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erreur interne du serveur' 
    : err.message;
  
  res.status(statusCode).json({ 
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;
