import express from 'express';
import { NotificationController } from '../controllers/notificationController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all notifications (admin only)
router.get('/', authenticateToken, requireAdmin, NotificationController.getAllNotifications);

// Get notification statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, NotificationController.getNotificationStats);

// Get recent failed notifications (admin only)
router.get('/failures', authenticateToken, requireAdmin, NotificationController.getRecentFailures);

// Retry failed notifications (admin only)
router.post('/retry-failures', authenticateToken, requireAdmin, NotificationController.retryFailedNotifications);

// Send test email (admin only)
router.post('/test-email', authenticateToken, requireAdmin, NotificationController.sendTestEmail);

// Send bulk notifications (admin only)
router.post('/bulk', authenticateToken, requireAdmin, NotificationController.sendBulkNotifications);

// Send upgrade recommendations (admin only)
router.post('/upgrade-recommendations', authenticateToken, requireAdmin, NotificationController.sendUpgradeRecommendations);

// Send limit warnings (admin only)
router.post('/limit-warnings', authenticateToken, requireAdmin, NotificationController.sendLimitWarnings);

// Delete old notifications (admin only)
router.delete('/old', authenticateToken, requireAdmin, NotificationController.deleteOldNotifications);

export default router; 
