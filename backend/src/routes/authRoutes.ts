// backend/src/routes/authRoutes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  register,
  login,
  verifyEmail,
  resendVerificationEmail,
  getProfile,
  getMe,
  updateProfile,
  changePassword,
  uploadAvatar,
  logout,
  verify2FALogin,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Configuration multer pour l'avatar
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/avatars/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const suffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${suffix}${path.extname(file.originalname)}`);
  },
});

const uploadAvatarMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  },
}).single('avatar');

// ============================================================
// ROUTES PUBLIQUES
// ============================================================

router.post('/register', register);
router.post('/login', login);
router.post('/2fa-login', verify2FALogin);

// ✅ Vérification email (public — l'utilisateur n'a pas encore de JWT)
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// ============================================================
// ROUTES PROTÉGÉES
// ============================================================

router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, getMe);
router.put('/update', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
router.post('/logout', authenticate, logout);

export default router;
