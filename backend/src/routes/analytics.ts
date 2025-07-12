import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = Router();

// Public route for tracking data (no authentication required)
router.post('/batch', AnalyticsController.trackBatch);

// Protected routes for analytics data
router.use(authenticateToken);
router.use(requireUser);

router.get('/:projectId', AnalyticsController.getAnalytics);
router.get('/:projectId/heatmap', AnalyticsController.getHeatmap);
router.get('/:projectId/live-visitors', AnalyticsController.getLiveVisitors);

export default router; 