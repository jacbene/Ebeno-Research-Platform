import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement avec chemin absolu
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import des routes
import authRoutes from './routes/authRoutes.js';
import projectRoutes from './routes/projectRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes); // Nouvelle route

// Routes de santé
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Ebeno Research Platform API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    frontendUrl: process.env.FRONTEND_URL
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Gestionnaire d'erreurs global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'non défini'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'non défini'}`);
});