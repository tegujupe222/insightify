import { Router } from 'express';
import { RealtimeController } from '../controllers/realtimeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get real-time analytics data
router.get('/:projectId', authenticateToken, RealtimeController.getRealtimeData);

// Get live visitor count
router.get('/:projectId/live-count', authenticateToken, RealtimeController.getLiveVisitorCount);

// Get recent events
router.get('/:projectId/recent-events', authenticateToken, RealtimeController.getRecentEvents);

export default router; 