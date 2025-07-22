import { Router } from 'express';
import { RealtimeController } from '../controllers/realtimeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get real-time analytics data
router.get('/:projectId', authenticateToken, RealtimeController.getRealtimeData);

// Get detailed live visitors
router.get('/:projectId/visitors', authenticateToken, RealtimeController.getDetailedLiveVisitors);

// Get recent page views
router.get('/:projectId/pageviews', authenticateToken, RealtimeController.getRecentPageViews);

// Get recent events
router.get('/:projectId/events', authenticateToken, RealtimeController.getRecentEvents);

export default router; 
