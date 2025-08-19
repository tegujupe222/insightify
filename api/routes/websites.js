const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { sql } = require('../database/connection');
const { verifyToken, requireWebsiteOwnership, generateApiKey } = require('../middleware/auth');
const { asyncHandler, validateRequest, validateQuery } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Validation schemas
const createWebsiteSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  url: Joi.string().uri().required(),
  settings: Joi.object({
    enableHeatmap: Joi.boolean().default(true),
    enableABTesting: Joi.boolean().default(false),
    enablePrivacyMode: Joi.boolean().default(false),
    enableCustomEvents: Joi.boolean().default(true),
    enableConversionGoals: Joi.boolean().default(true),
    sessionTimeout: Joi.number().integer().min(1).max(1440).default(30),
    maxEventsPerSession: Joi.number().integer().min(100).max(10000).default(1000)
  }).default({})
});

const updateWebsiteSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  url: Joi.string().uri(),
  isActive: Joi.boolean(),
  settings: Joi.object({
    enableHeatmap: Joi.boolean(),
    enableABTesting: Joi.boolean(),
    enablePrivacyMode: Joi.boolean(),
    enableCustomEvents: Joi.boolean(),
    enableConversionGoals: Joi.boolean(),
    sessionTimeout: Joi.number().integer().min(1).max(1440),
    maxEventsPerSession: Joi.number().integer().min(100).max(10000)
  })
});

const websiteQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().max(100),
  isActive: Joi.boolean()
});

// GET /api/websites - Get user's websites
router.get('/',
  verifyToken,
  validateQuery(websiteQuerySchema),
  asyncHandler(async (req, res) => {
    const { limit, offset, search, isActive } = req.validatedQuery;
    
    try {
      let query = sql`
        SELECT id, name, url, domain, is_active, created_at, updated_at, settings
        FROM websites 
        WHERE user_id = ${req.user.id}
      `;
      
      const params = [];
      
      if (search) {
        query = sql`${query} AND (name ILIKE ${`%${search}%`} OR url ILIKE ${`%${search}%`})`;
      }
      
      if (isActive !== undefined) {
        query = sql`${query} AND is_active = ${isActive}`;
      }
      
      query = sql`${query} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      
      const result = await query;
      
      // Get total count
      let countQuery = sql`
        SELECT COUNT(*) as total
        FROM websites 
        WHERE user_id = ${req.user.id}
      `;
      
      if (search) {
        countQuery = sql`${countQuery} AND (name ILIKE ${`%${search}%`} OR url ILIKE ${`%${search}%`})`;
      }
      
      if (isActive !== undefined) {
        countQuery = sql`${countQuery} AND is_active = ${isActive}`;
      }
      
      const countResult = await countQuery;
      const total = parseInt(countResult.rows[0].total);
      
      res.json({
        success: true,
        data: {
          websites: result.rows,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      });
    } catch (error) {
      logger.error('Error getting websites:', error);
      throw error;
    }
  })
);

// POST /api/websites - Create new website
router.post('/',
  verifyToken,
  validateRequest(createWebsiteSchema),
  asyncHandler(async (req, res) => {
    const { name, url, settings } = req.validatedBody;
    
    try {
      // Extract domain from URL
      const domain = new URL(url).hostname;
      
      // Generate API key for website
      const apiKey = generateApiKey();
      
      // Create website
      const result = await sql`
        INSERT INTO websites (
          user_id, name, url, domain, is_active, settings, api_key, created_at, updated_at
        ) VALUES (
          ${req.user.id}, ${name}, ${url}, ${domain}, true, ${settings}, ${apiKey}, NOW(), NOW()
        ) RETURNING id, name, url, domain, is_active, settings, api_key, created_at
      `;
      
      const website = result.rows[0];
      
      logger.info(`Website created: ${name} by user ${req.user.email}`);
      
      res.status(201).json({
        success: true,
        message: 'Website created successfully',
        data: {
          website: {
            id: website.id,
            name: website.name,
            url: website.url,
            domain: website.domain,
            isActive: website.is_active,
            settings: website.settings,
            apiKey: website.api_key,
            createdAt: website.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error creating website:', error);
      throw error;
    }
  })
);

// GET /api/websites/:id - Get website details
router.get('/:id',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await sql`
        SELECT id, name, url, domain, is_active, settings, api_key, created_at, updated_at
        FROM websites 
        WHERE id = ${id} AND user_id = ${req.user.id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      const website = result.rows[0];
      
      // Get website statistics
      const statsResult = await sql`
        SELECT 
          COUNT(DISTINCT pv.session_id) as total_sessions,
          COUNT(pv.id) as total_page_views,
          COUNT(ce.id) as total_clicks,
          COUNT(cve.id) as total_conversions
        FROM websites w
        LEFT JOIN page_views pv ON w.id = pv.website_id
        LEFT JOIN click_events ce ON w.id = ce.website_id
        LEFT JOIN conversion_events cve ON w.id = cve.website_id
        WHERE w.id = ${id}
      `;
      
      const stats = statsResult.rows[0];
      
      res.json({
        success: true,
        data: {
          website: {
            id: website.id,
            name: website.name,
            url: website.url,
            domain: website.domain,
            isActive: website.is_active,
            settings: website.settings,
            apiKey: website.api_key,
            createdAt: website.created_at,
            updatedAt: website.updated_at
          },
          stats: {
            totalSessions: parseInt(stats.total_sessions),
            totalPageViews: parseInt(stats.total_page_views),
            totalClicks: parseInt(stats.total_clicks),
            totalConversions: parseInt(stats.total_conversions)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting website details:', error);
      throw error;
    }
  })
);

// PUT /api/websites/:id - Update website
router.put('/:id',
  verifyToken,
  requireWebsiteOwnership,
  validateRequest(updateWebsiteSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.validatedBody;
    
    try {
      // Build update query dynamically
      let updateFields = [];
      let values = [];
      let paramIndex = 1;
      
      if (updateData.name) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }
      
      if (updateData.url) {
        updateFields.push(`url = $${paramIndex++}`);
        values.push(updateData.url);
        
        // Update domain if URL changed
        const domain = new URL(updateData.url).hostname;
        updateFields.push(`domain = $${paramIndex++}`);
        values.push(domain);
      }
      
      if (updateData.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updateData.isActive);
      }
      
      if (updateData.settings) {
        updateFields.push(`settings = settings || $${paramIndex++}`);
        values.push(JSON.stringify(updateData.settings));
      }
      
      updateFields.push(`updated_at = NOW()`);
      
      if (updateFields.length === 1) { // Only updated_at
        return res.status(400).json({
          success: false,
          error: 'No fields to update'
        });
      }
      
      const query = `
        UPDATE websites 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
        RETURNING id, name, url, domain, is_active, settings, updated_at
      `;
      
      values.push(id, req.user.id);
      
      const result = await sql.unsafe(query, values);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      const website = result.rows[0];
      
      logger.info(`Website updated: ${website.name} by user ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Website updated successfully',
        data: {
          website: {
            id: website.id,
            name: website.name,
            url: website.url,
            domain: website.domain,
            isActive: website.is_active,
            settings: website.settings,
            updatedAt: website.updated_at
          }
        }
      });
    } catch (error) {
      logger.error('Error updating website:', error);
      throw error;
    }
  })
);

// DELETE /api/websites/:id - Delete website
router.delete('/:id',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      // Get website name for logging
      const websiteResult = await sql`
        SELECT name FROM websites WHERE id = ${id} AND user_id = ${req.user.id}
      `;
      
      if (websiteResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      // Delete website (cascade will handle related data)
      const result = await sql`
        DELETE FROM websites WHERE id = ${id} AND user_id = ${req.user.id}
      `;
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      logger.info(`Website deleted: ${websiteResult.rows[0].name} by user ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Website deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting website:', error);
      throw error;
    }
  })
);

// POST /api/websites/:id/regenerate-api-key - Regenerate API key
router.post('/:id/regenerate-api-key',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      // Generate new API key
      const newApiKey = generateApiKey();
      
      // Update website
      const result = await sql`
        UPDATE websites 
        SET api_key = ${newApiKey}, updated_at = NOW()
        WHERE id = ${id} AND user_id = ${req.user.id}
        RETURNING id, name, api_key
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      const website = result.rows[0];
      
      logger.info(`API key regenerated for website: ${website.name}`);
      
      res.json({
        success: true,
        message: 'API key regenerated successfully',
        data: {
          apiKey: website.api_key
        }
      });
    } catch (error) {
      logger.error('Error regenerating API key:', error);
      throw error;
    }
  })
);

// GET /api/websites/:id/tracking-code - Get tracking code
router.get('/:id/tracking-code',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await sql`
        SELECT name, url, api_key, settings
        FROM websites 
        WHERE id = ${id} AND user_id = ${req.user.id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Website not found'
        });
      }
      
      const website = result.rows[0];
      
      // Generate tracking code
      const trackingCode = generateTrackingCode(website);
      
      res.json({
        success: true,
        data: {
          trackingCode,
          website: {
            id,
            name: website.name,
            url: website.url,
            apiKey: website.api_key,
            settings: website.settings
          }
        }
      });
    } catch (error) {
      logger.error('Error getting tracking code:', error);
      throw error;
    }
  })
);

// Helper function to generate tracking code
function generateTrackingCode(website) {
  const apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com/api' 
    : 'http://localhost:3001/api';
  
  return `<!-- Insightify Tracking Code -->
<script>
  (function(i,s,o,g,r,a,m){i['InsightifyObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','${apiUrl}/tracking.js','insightify');

  insightify('init', '${website.api_key}', {
    websiteId: '${website.id}',
    url: '${website.url}',
    settings: ${JSON.stringify(website.settings)}
  });
</script>`;
}

module.exports = router;
