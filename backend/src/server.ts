import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

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

import { CollaborationSocketHandler } from './sockets/collaborationSocket';
import { db } from './db/knex';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = Number(process.env.PORT) || 5001;

const httpServer = createServer(app);

// Configurer Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

new CollaborationSocketHandler(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
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
      health: '/api/health'
    }
  });
});

// Gestion 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée', path: req.originalUrl });
});

// Gestion d'erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur:', err.message);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// ---------- DÉMARRAGE AVEC CRÉATION AUTOMATIQUE DE document_entities ----------
db.migrate
  .latest()
  .then(async () => {
    console.log('✅ Migrations appliquées avec succès');

    // Création de la table document_entities si elle n'existe pas (SQL direct)
    try {
      const result = await db.raw(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'document_entities'
        ) as exists
      `);
      const exists = result.rows[0]?.exists || false;
      
      if (!exists) {
        console.log('📦 Création de la table document_entities (SQL direct)...');
        await db.raw(`
          CREATE TABLE document_entities (
            id VARCHAR(255) PRIMARY KEY,
            "documentId" VARCHAR(255) NOT NULL,
            "documentType" VARCHAR(50) NOT NULL,
            entity VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            count INTEGER DEFAULT 1,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX idx_doc_entities_doc ON document_entities("documentId", "documentType");
          CREATE INDEX idx_doc_entities_entity ON document_entities(entity);
          CREATE INDEX idx_doc_entities_type ON document_entities(type);
        `);
        console.log('✅ Table document_entities créée avec succès (SQL direct)');
      } else {
        console.log('ℹ️ Table document_entities existe déjà');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création SQL de document_entities:', error);
    }

    // Démarrer le serveur HTTP avec Socket.IO
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur le port ${port}`);
      console.log(`📁 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ Erreur lors des migrations:', err);
    process.exit(1);
  });

export { io };
export default app;
