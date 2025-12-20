// backend/routes/apiRoutes.ts
import express from 'express';
import apiController from '../controllers/apiController';
import integrationController from '../controllers/integrationController';
import { apiAuthMiddleware, apiRateLimiter, apiLogMiddleware } from '../middleware/apiAuthMiddleware';

const router = express.Router();

// Routes publiques (sans authentification)
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

router.get('/status', (req, res) => {
  res.json({
    service: 'Ebeno API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Routes protégées par clé API
router.use('/v1', apiAuthMiddleware, apiRateLimiter, apiLogMiddleware);

// Gestion des clés API
router.post('/v1/keys', apiController.generateApiKey);
router.get('/v1/keys', apiController.listApiKeys);
router.delete('/v1/keys/:keyId', apiController.revokeApiKey);

// Webhooks
router.post('/v1/webhooks', apiController.createWebhook);
router.get('/v1/webhooks', apiController.listWebhooks);
router.delete('/v1/webhooks/:id', apiController.deleteWebhook);

// Statistiques d'utilisation
router.get('/v1/usage', apiController.getApiUsage);

// Validation de clé
router.post('/v1/validate', apiController.validateApiKey);

// Intégrations
router.post('/v1/integrations/zotero/sync', integrationController.syncWithZotero);
router.post('/v1/integrations/scholar/search', integrationController.searchGoogleScholar);
router.post('/v1/integrations/scholar/import', integrationController.importFromGoogleScholar);
router.get('/v1/integrations/orcid/profile', integrationController.getOrcidProfile);
router.post('/v1/integrations/orcid/link', integrationController.linkOrcidAccount);
router.get('/v1/integrations/configs', integrationController.getIntegrationConfigs);

// Endpoints de données (exemples)
router.get('/v1/projects', apiController.getProjects);
router.get('/v1/projects/:id', apiController.getProject);
router.get('/v1/documents', apiController.getDocuments);
router.get('/v1/references', apiController.getReferences);

export default router;
