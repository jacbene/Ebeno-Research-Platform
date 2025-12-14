import { Router } from 'express';
import { deleteCurrentUser, exportCurrentUserDate } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Delete the currently authenticated user's account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User account and all associated data have been successfully deleted.
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: An error occurred while deleting the user account.
 */
router.delete('/me', protect, deleteCurrentUser);

/**
 * @swagger
 * /api/users/me/export:
 *   get:
 *     summary: Export all data for the currently authenticated user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A JSON file containing all user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: An error occurred while exporting user data.
 */
router.get('/me/export', protect, exportCurrentUserDate);

export default router;