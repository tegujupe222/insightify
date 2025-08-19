const express = require('express');
const router = express.Router();
const { sql } = require('../database/connection');
const { verifyToken, requireWebsiteOwnership } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/heatmaps/:websiteId/pages - Get heatmap pages
router.get('/:websiteId/pages',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { startDate, endDate } = req.query;
    
    try {
      let query = sql`
        SELECT DISTINCT url, page_title, COUNT(*) as click_count
        FROM click_events 
        WHERE website_id = ${websiteId}
      `;
      
      if (startDate && endDate) {
        query = sql`${query} AND timestamp BETWEEN ${startDate} AND ${endDate}`;
      }
      
      query = sql`${query} GROUP BY url, page_title ORDER BY click_count DESC`;
      
      const result = await query;
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error getting heatmap pages:', error);
      throw error;
    }
  })
);

// GET /api/heatmaps/:websiteId/pages/:pageUrl - Get heatmap data for page
router.get('/:websiteId/pages/:pageUrl',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId, pageUrl } = req.params;
    const { startDate, endDate } = req.query;
    
    try {
      let query = sql`
        SELECT x_position, y_position, element_tag, element_text, COUNT(*) as click_count
        FROM click_events 
        WHERE website_id = ${websiteId} AND url = ${decodeURIComponent(pageUrl)}
      `;
      
      if (startDate && endDate) {
        query = sql`${query} AND timestamp BETWEEN ${startDate} AND ${endDate}`;
      }
      
      query = sql`${query} GROUP BY x_position, y_position, element_tag, element_text ORDER BY click_count DESC`;
      
      const result = await query;
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error getting heatmap data:', error);
      throw error;
    }
  })
);

module.exports = router;
