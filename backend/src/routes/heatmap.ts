import express from 'express';
import { HeatmapController } from '../controllers/heatmapController';
import { authenticateToken, requireUser } from '../middleware/auth';

const router = express.Router();

// Get heatmap pages for a project
router.get('/projects/:projectId/pages', authenticateToken, requireUser, HeatmapController.getPages);

// Get heatmap statistics for a project
router.get('/projects/:projectId/stats', authenticateToken, requireUser, HeatmapController.getProjectStats);

// Get heatmap data for a specific page
router.get('/projects/:projectId/pages/:pageUrl', authenticateToken, requireUser, HeatmapController.getPageData);

// Get element analysis for a page
router.get('/projects/:projectId/pages/:pageUrl/elements', authenticateToken, requireUser, HeatmapController.getElementAnalysis);

// Get heatmap data by date range
router.get('/projects/:projectId/pages/:pageUrl/range', authenticateToken, requireUser, HeatmapController.getDataByDateRange);

// Get heatmap data for entire project
router.get('/projects/:projectId/data', authenticateToken, requireUser, HeatmapController.getProjectData);

// Export heatmap data
router.get('/projects/:projectId/export', authenticateToken, requireUser, HeatmapController.exportData);

// Delete heatmap data for a page
router.delete('/projects/:projectId/pages/:pageUrl', authenticateToken, requireUser, HeatmapController.deletePageData);

export default router; 
