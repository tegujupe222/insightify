const express = require('express');
const router = express.Router();
const { sql } = require('../database/connection');
const { verifyToken, requireWebsiteOwnership } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/funnels/:websiteId - Get funnels for website
router.get('/:websiteId',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
      const result = await sql`
        SELECT id, name, description, steps, is_active, created_at
        FROM funnels 
        WHERE website_id = ${websiteId}
        ORDER BY created_at DESC
      `;
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error getting funnels:', error);
      throw error;
    }
  })
);

// POST /api/funnels - Create funnel
router.post('/',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId, name, description, steps } = req.body;
    
    try {
      const result = await sql`
        INSERT INTO funnels (
          website_id, name, description, steps, created_at
        ) VALUES (
          ${websiteId}, ${name}, ${description}, ${steps}, NOW()
        ) RETURNING id, name, created_at
      `;
      
      const funnel = result.rows[0];
      
      logger.info(`Funnel created: ${name} for website ${websiteId}`);
      
      res.status(201).json({
        success: true,
        message: 'Funnel created successfully',
        data: { funnel }
      });
    } catch (error) {
      logger.error('Error creating funnel:', error);
      throw error;
    }
  })
);

module.exports = router;
