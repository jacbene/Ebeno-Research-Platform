import { Router } from 'express';
import { getVersions, restoreVersion } from '../services/versionService';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/:documentId', authenticate, async (req, res) => {
  try {
    const versions = await getVersions(req.params.documentId);
    res.json(versions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/:documentId/restore/:version', authenticate, async (req, res) => {
  try {
    const content = await restoreVersion(req.params.documentId, parseInt(req.params.version));
    res.json({ content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
