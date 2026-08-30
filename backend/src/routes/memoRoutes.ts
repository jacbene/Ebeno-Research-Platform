import { Router } from 'express';
import { getMemos, getMemoById, createMemo, updateMemo, deleteMemo } from '../controllers/memoController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Routes protégées
router.get('/', authenticate, getMemos);
router.get('/:id', authenticate, getMemoById);
router.post('/', authenticate, createMemo);
router.put('/:id', authenticate, updateMemo);
router.delete('/:id', authenticate, deleteMemo);

export default router;
