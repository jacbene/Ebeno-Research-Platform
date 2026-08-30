import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import transcriptionRoutes from './routes/transcriptionRoutes';
import collaborationRoutes from './routes/collaborationRoutes';
import surveyRoutes from './routes/surveyRoutes';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/transcriptions', transcriptionRoutes);
app.use('/api/collaborations', collaborationRoutes);
app.use('/api/surveys', surveyRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Ebeno API' });
});

app.listen(port, () => {
  console.log(`🚀 Serveur test sur le port ${port}`);
});
