import express from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken, requireAdmin, requireUser } from '../middleware/auth';

const router = express.Router();

// User routes (authenticated)
router.get('/user', authenticateToken, requireUser, NotificationController.getUserNotifications);
router.put('/:notificationId/read', authenticateToken, requireUser, NotificationController.markAsRead);

// Admin routes
router.post('/send-upgrade-recommendations', authenticateToken, requireAdmin, NotificationController.sendUpgradeRecommendations);
router.post('/send-limit-warnings', authenticateToken, requireAdmin, NotificationController.sendLimitWarnings);
router.get('/type/:type', authenticateToken, requireAdmin, NotificationController.getNotificationsByType);
router.delete('/old', authenticateToken, requireAdmin, NotificationController.deleteOldNotifications);

export default router; 