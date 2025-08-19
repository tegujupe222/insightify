const express = require('express');
const router = express.Router();
const { sql } = require('../database/connection');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/admin/stats - Get admin statistics
router.get('/stats',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      // Get total users
      const usersResult = await sql`SELECT COUNT(*) as count FROM users`;
      
      // Get total websites
      const websitesResult = await sql`SELECT COUNT(*) as count FROM websites`;
      
      // Get total page views
      const pageViewsResult = await sql`SELECT COUNT(*) as count FROM page_views`;
      
      // Get total conversions
      const conversionsResult = await sql`SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value FROM conversion_events`;
      
      // Get active subscriptions
      const subscriptionsResult = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE subscription_status = 'active' AND subscription_plan != 'free'
      `;
      
      const stats = {
        totalUsers: parseInt(usersResult.rows[0].count),
        totalWebsites: parseInt(websitesResult.rows[0].count),
        totalPageViews: parseInt(pageViewsResult.rows[0].count),
        totalConversions: parseInt(conversionsResult.rows[0].count),
        totalRevenue: parseFloat(conversionsResult.rows[0].total_value),
        activeSubscriptions: parseInt(subscriptionsResult.rows[0].count)
      };
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting admin stats:', error);
      throw error;
    }
  })
);

// GET /api/admin/users - Get all users
router.get('/users',
  verifyToken,
  requireAdmin,
  asyncHandler(async (req, res) => {
    try {
      const result = await sql`
        SELECT id, email, name, is_admin, subscription_status, subscription_plan, created_at
        FROM users 
        ORDER BY created_at DESC
      `;
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  })
);

module.exports = router;
