import app from './server';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur le port ${PORT}`);
  console.log(`📊 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🤖 DeepSeek: ${process.env.DEEPSEEK_API_KEY ? 'Configuré ✓' : 'Non configuré ✗'}`);
});
