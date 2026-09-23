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
  forgotPassword,
  resetPassword,
  deleteMyAccount,              // ✅ NOUVEAU
  cancelAccountDeletionHandler, // ✅ NOUVEAU
  getEmailPreferences,
  setEmailPreferences,
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

// ============================================================
// Configuration multer pour l'avatar
// ============================================================
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
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

// ✅ Vérification email
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

// ✅ Mot de passe oublié
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// ✅ NOUVEAU : Annulation de suppression de compte (via token email)
router.post('/cancel-deletion', cancelAccountDeletionHandler);

// ============================================================
// ROUTES PROTÉGÉES
// ============================================================

router.get('/profile', authenticate, getProfile);
router.get('/me', authenticate, getMe);
router.put('/update', authenticate, updateProfile);
router.put('/change-password', authenticate, changePassword);
router.post('/avatar', authenticate, uploadAvatarMiddleware, uploadAvatar);
router.post('/logout', authenticate, logout);

// ✅ Préférences email
router.get('/email-preferences', authenticate, getEmailPreferences);
router.put('/email-preferences', authenticate, setEmailPreferences);

// ✅ NOUVEAU : Suppression de compte (RGPD art. 17)
router.delete('/me', authenticate, deleteMyAccount);

export default router;
