// backend/src/routes/authRoutes.ts
import { Router } from 'express';
import { register, login, getProfile, getMe, logout } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);

// ✅ Route protégée : profil de l'utilisateur connecté
router.get('/profile', authenticate, getProfile);

// ✅ Alias `/me` (plus RESTful)
router.get('/me', authenticate, getMe);

router.post('/logout', logout);

export default router;
