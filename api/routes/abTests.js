const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { sql } = require('../database/connection');
const { verifyToken, requireWebsiteOwnership } = require('../middleware/auth');
const { asyncHandler, validateRequest } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// GET /api/ab-tests - Get A/B tests for website
router.get('/:websiteId',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
      const result = await sql`
        SELECT id, name, description, status, start_date, end_date, traffic_split, goals, created_at
        FROM ab_tests 
        WHERE website_id = ${websiteId}
        ORDER BY created_at DESC
      `;
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Error getting A/B tests:', error);
      throw error;
    }
  })
);

// POST /api/ab-tests - Create A/B test
router.post('/',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId, name, description, startDate, endDate, trafficSplit, goals } = req.body;
    
    try {
      const result = await sql`
        INSERT INTO ab_tests (
          website_id, name, description, start_date, end_date, traffic_split, goals, created_at
        ) VALUES (
          ${websiteId}, ${name}, ${description}, ${startDate}, ${endDate}, ${trafficSplit}, ${goals}, NOW()
        ) RETURNING id, name, status, created_at
      `;
      
      const abTest = result.rows[0];
      
      logger.info(`A/B test created: ${name} for website ${websiteId}`);
      
      res.status(201).json({
        success: true,
        message: 'A/B test created successfully',
        data: { abTest }
      });
    } catch (error) {
      logger.error('Error creating A/B test:', error);
      throw error;
    }
  })
);

module.exports = router;
