import express from 'express';
import { registerUser, loginUser, getMe, verifyEmail, forgotPassword, resetPassword } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', registerUser);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', loginUser);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   GET api/auth/verify/:token
// @desc    Verify email
// @access  Public
router.get('/verify/:token', verifyEmail);

// @route   POST api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', forgotPassword);

// @route   POST api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.post('/reset-password/:token', resetPassword);

export default router;
