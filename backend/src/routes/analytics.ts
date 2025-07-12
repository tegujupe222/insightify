import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

// Public route for tracking data (no authentication required)
router.post('/batch', AnalyticsController.trackBatch);

// Protected routes for analytics data
router.use(authenticateToken);
router.use(requireUser);

// Get custom events
router.get('/:projectId/custom-events', authenticateToken, requireUser, AnalyticsController.getCustomEvents);

// Export analytics data
router.get('/:projectId/export', authenticateToken, requireUser, AnalyticsController.exportData);

// Get analytics data with filters
router.get('/:projectId/filtered', authenticateToken, requireUser, AnalyticsController.getFilteredAnalytics);

// Get analytics data
router.get('/:projectId', authenticateToken, requireUser, AnalyticsController.getAnalytics);
router.get('/:projectId/heatmap', AnalyticsController.getHeatmap);
router.get('/:projectId/live-visitors', AnalyticsController.getLiveVisitors);

export default router; 