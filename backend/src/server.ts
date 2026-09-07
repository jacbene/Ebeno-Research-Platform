// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { db } from './db/knex';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import transcriptionRoutes from './routes/transcriptionRoutes';
import memoRoutes from './routes/memoRoutes';
import analysisRoutes from './routes/analysisRoutes';
import summaryRoutes from './routes/summaryRoutes';
import fileRoutes from './routes/fileRoutes';
import uploadRoutes from './routes/uploadRoutes'; // Nouvelle route
import { authenticate } from './middleware/auth';
import { setupCollaboration } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'https://ebeno-frontend.onrender.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  },
});

// Middleware CORS (doit être avant les routes)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://ebeno-frontend.onrender.com',
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/transcriptions', authenticate, transcriptionRoutes);
app.use('/api/memos', authenticate, memoRoutes);
app.use('/api/analysis', authenticate, analysisRoutes);
app.use('/api/summary', authenticate, summaryRoutes);
app.use('/api/upload', authenticate, uploadRoutes); // Nouvelle route
app.use('/api/files', authenticate, fileRoutes); // Garde l'ancienne si besoin

// Socket.IO collaboration
setupCollaboration(io);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Démarrer le serveur
const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    // Connexion à la base
    await db.raw('SELECT 1');
    console.log('✅ Base de données connectée');

    // ---------- CRÉATION AUTOMATIQUE DE LA TABLE document_entities ----------
    try {
      const hasTable = await db.schema.hasTable('document_entities');
      if (!hasTable) {
        console.log('📦 Création de la table document_entities...');
        await db.schema.createTable('document_entities', (table) => {
          table.string('id').primary();
          table.string('documentId').notNullable();
          table.string('documentType').notNullable();
          table.string('entity').notNullable();
          table.string('type').notNullable();
          table.integer('count').defaultTo(1);
          table.timestamp('createdAt').defaultTo(db.fn.now());
          table.timestamp('updatedAt').defaultTo(db.fn.now());

          table.index(['documentId', 'documentType']);
          table.index('entity');
          table.index('type');
        });
        console.log('✅ Table document_entities créée avec succès');
      } else {
        console.log('ℹ️ Table document_entities existe déjà');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification/création de document_entities:', error);
    }
    // ---------- FIN ----------

    // Appliquer les migrations (si vous le souhaitez, mais déjà fait dans le script)
    // await db.migrate.latest();

    server.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📁 Environnement: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Erreur de démarrage:', error);
    process.exit(1);
  }
}

startServer();

