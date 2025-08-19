const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { sql } = require('../database/connection');
const { verifyToken, verifyApiKey, requireWebsiteOwnership, createRateLimiter } = require('../middleware/auth');
const { asyncHandler, validateRequest, validateQuery } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { setRealTimeData, getRealTimeData, incrementCounter } = require('../database/redis');

// Rate limiting
const analyticsLimiter = createRateLimiter(1000, 15 * 60 * 1000); // 1000 requests per 15 minutes

// Validation schemas
const pageViewSchema = Joi.object({
  websiteId: Joi.string().uuid().required(),
  sessionId: Joi.string().required(),
  url: Joi.string().uri().required(),
  pageTitle: Joi.string().max(500),
  userAgent: Joi.string(),
  referrer: Joi.string().uri().allow(''),
  loadTime: Joi.number().integer().min(0),
  metadata: Joi.object()
});

const clickEventSchema = Joi.object({
  websiteId: Joi.string().uuid().required(),
  sessionId: Joi.string().required(),
  url: Joi.string().uri().required(),
  elementId: Joi.string(),
  elementClass: Joi.string(),
  elementTag: Joi.string().required(),
  elementText: Joi.string(),
  xPosition: Joi.number().integer().min(0).required(),
  yPosition: Joi.number().integer().min(0).required(),
  viewportWidth: Joi.number().integer().min(0),
  viewportHeight: Joi.number().integer().min(0),
  metadata: Joi.object()
});

const conversionEventSchema = Joi.object({
  websiteId: Joi.string().uuid().required(),
  sessionId: Joi.string().required(),
  url: Joi.string().uri().required(),
  goal: Joi.string().required(),
  value: Joi.number().positive(),
  abTestVariant: Joi.string(),
  metadata: Joi.object()
});

const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month'),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  offset: Joi.number().integer().min(0).default(0)
});

// POST /api/analytics/pageview - Track page view
router.post('/pageview', 
  analyticsLimiter,
  validateRequest(pageViewSchema),
  asyncHandler(async (req, res) => {
    const { websiteId, sessionId, url, pageTitle, userAgent, referrer, loadTime, metadata } = req.validatedBody;
    
    try {
      // Insert page view
      const result = await sql`
        INSERT INTO page_views (
          website_id, session_id, url, page_title, user_agent, referrer, 
          ip_address, load_time, metadata, timestamp
        ) VALUES (
          ${websiteId}, ${sessionId}, ${url}, ${pageTitle}, ${userAgent}, ${referrer},
          ${req.ip}, ${loadTime}, ${metadata || {}}, NOW()
        ) RETURNING id
      `;

      // Update session
      await sql`
        INSERT INTO sessions (id, website_id, last_activity, page_views_count)
        VALUES (${sessionId}, ${websiteId}, NOW(), 1)
        ON CONFLICT (id) DO UPDATE SET
          last_activity = NOW(),
          page_views_count = sessions.page_views_count + 1
      `;

      // Update real-time data
      await updateRealTimeData(websiteId, 'pageview');

      logger.logAnalytics({
        eventType: 'pageview',
        websiteId,
        sessionId,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Page view tracked successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      logger.error('Error tracking page view:', error);
      throw error;
    }
  })
);

// POST /api/analytics/click - Track click event
router.post('/click',
  analyticsLimiter,
  validateRequest(clickEventSchema),
  asyncHandler(async (req, res) => {
    const { websiteId, sessionId, url, elementId, elementClass, elementTag, elementText, xPosition, yPosition, viewportWidth, viewportHeight, metadata } = req.validatedBody;
    
    try {
      // Insert click event
      const result = await sql`
        INSERT INTO click_events (
          website_id, session_id, url, element_id, element_class, element_tag,
          element_text, x_position, y_position, viewport_width, viewport_height,
          metadata, timestamp
        ) VALUES (
          ${websiteId}, ${sessionId}, ${url}, ${elementId}, ${elementClass}, ${elementTag},
          ${elementText}, ${xPosition}, ${yPosition}, ${viewportWidth}, ${viewportHeight},
          ${metadata || {}}, NOW()
        ) RETURNING id
      `;

      // Update session
      await sql`
        UPDATE sessions 
        SET last_activity = NOW(), clicks_count = clicks_count + 1
        WHERE id = ${sessionId}
      `;

      // Update real-time data
      await updateRealTimeData(websiteId, 'click');

      logger.logAnalytics({
        eventType: 'click',
        websiteId,
        sessionId,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Click event tracked successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      logger.error('Error tracking click event:', error);
      throw error;
    }
  })
);

// POST /api/analytics/conversion - Track conversion event
router.post('/conversion',
  analyticsLimiter,
  validateRequest(conversionEventSchema),
  asyncHandler(async (req, res) => {
    const { websiteId, sessionId, url, goal, value, abTestVariant, metadata } = req.validatedBody;
    
    try {
      // Insert conversion event
      const result = await sql`
        INSERT INTO conversion_events (
          website_id, session_id, url, goal, value, ab_test_variant,
          metadata, timestamp
        ) VALUES (
          ${websiteId}, ${sessionId}, ${url}, ${goal}, ${value}, ${abTestVariant},
          ${metadata || {}}, NOW()
        ) RETURNING id
      `;

      // Update session
      await sql`
        UPDATE sessions 
        SET last_activity = NOW(), conversions_count = conversions_count + 1
        WHERE id = ${sessionId}
      `;

      // Update real-time data
      await updateRealTimeData(websiteId, 'conversion');

      logger.logAnalytics({
        eventType: 'conversion',
        websiteId,
        sessionId,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Conversion event tracked successfully',
        data: { id: result.rows[0].id }
      });
    } catch (error) {
      logger.error('Error tracking conversion event:', error);
      throw error;
    }
  })
);

// GET /api/analytics/:websiteId/summary - Get analytics summary
router.get('/:websiteId/summary',
  verifyToken,
  requireWebsiteOwnership,
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { startDate, endDate } = req.validatedQuery;
    
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const end = endDate || new Date();

      // Get page views count
      const pageViewsResult = await sql`
        SELECT COUNT(*) as count
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
      `;

      // Get unique sessions count
      const sessionsResult = await sql`
        SELECT COUNT(DISTINCT session_id) as count
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
      `;

      // Get clicks count
      const clicksResult = await sql`
        SELECT COUNT(*) as count
        FROM click_events 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
      `;

      // Get conversions count
      const conversionsResult = await sql`
        SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
        FROM conversion_events 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
      `;

      // Get top pages
      const topPagesResult = await sql`
        SELECT url, page_title, COUNT(*) as views
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
        GROUP BY url, page_title
        ORDER BY views DESC
        LIMIT 10
      `;

      // Get device breakdown
      const deviceResult = await sql`
        SELECT 
          CASE 
            WHEN user_agent LIKE '%Mobile%' THEN 'mobile'
            WHEN user_agent LIKE '%Tablet%' THEN 'tablet'
            ELSE 'desktop'
          END as device_type,
          COUNT(*) as count
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
        GROUP BY device_type
        ORDER BY count DESC
      `;

      const summary = {
        period: { start: start, end: end },
        pageViews: parseInt(pageViewsResult.rows[0].count),
        uniqueSessions: parseInt(sessionsResult.rows[0].count),
        clicks: parseInt(clicksResult.rows[0].count),
        conversions: parseInt(conversionsResult.rows[0].count),
        totalValue: parseFloat(conversionsResult.rows[0].total_value),
        conversionRate: sessionsResult.rows[0].count > 0 ? 
          (parseInt(conversionsResult.rows[0].count) / parseInt(sessionsResult.rows[0].count) * 100).toFixed(2) : 0,
        topPages: topPagesResult.rows,
        deviceBreakdown: deviceResult.rows
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting analytics summary:', error);
      throw error;
    }
  })
);

// GET /api/analytics/:websiteId/trends - Get analytics trends
router.get('/:websiteId/trends',
  verifyToken,
  requireWebsiteOwnership,
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.validatedQuery;
    
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      let timeFormat;
      switch (groupBy) {
        case 'hour':
          timeFormat = "YYYY-MM-DD HH24:00:00";
          break;
        case 'week':
          timeFormat = "YYYY-'W'WW";
          break;
        case 'month':
          timeFormat = "YYYY-MM";
          break;
        default:
          timeFormat = "YYYY-MM-DD";
      }

      // Get page views trend
      const pageViewsTrend = await sql`
        SELECT 
          TO_CHAR(timestamp, ${timeFormat}) as period,
          COUNT(*) as page_views,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
        GROUP BY period
        ORDER BY period
      `;

      // Get conversions trend
      const conversionsTrend = await sql`
        SELECT 
          TO_CHAR(timestamp, ${timeFormat}) as period,
          COUNT(*) as conversions,
          COALESCE(SUM(value), 0) as total_value
        FROM conversion_events 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
        GROUP BY period
        ORDER BY period
      `;

      res.json({
        success: true,
        data: {
          pageViewsTrend: pageViewsTrend.rows,
          conversionsTrend: conversionsTrend.rows,
          groupBy
        }
      });
    } catch (error) {
      logger.error('Error getting analytics trends:', error);
      throw error;
    }
  })
);

// GET /api/analytics/:websiteId/realtime - Get real-time data
router.get('/:websiteId/realtime',
  verifyToken,
  requireWebsiteOwnership,
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    
    try {
      // Get real-time data from Redis
      const realtimeData = await getRealTimeData(websiteId) || {
        activeSessions: 0,
        pageViewsLastHour: 0,
        clicksLastHour: 0,
        conversionsLastHour: 0
      };

      // Get active sessions count
      const activeSessionsResult = await sql`
        SELECT COUNT(*) as count
        FROM sessions 
        WHERE website_id = ${websiteId} 
        AND is_active = true 
        AND last_activity > NOW() - INTERVAL '30 minutes'
      `;

      realtimeData.activeSessions = parseInt(activeSessionsResult.rows[0].count);

      res.json({
        success: true,
        data: realtimeData
      });
    } catch (error) {
      logger.error('Error getting real-time data:', error);
      throw error;
    }
  })
);

// GET /api/analytics/:websiteId/visitors - Get visitor analysis
router.get('/:websiteId/visitors',
  verifyToken,
  requireWebsiteOwnership,
  validateQuery(analyticsQuerySchema),
  asyncHandler(async (req, res) => {
    const { websiteId } = req.params;
    const { startDate, endDate, limit = 100, offset = 0 } = req.validatedQuery;
    
    try {
      const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate || new Date();

      // Get visitor sessions
      const visitorsResult = await sql`
        SELECT 
          session_id,
          MIN(timestamp) as first_visit,
          MAX(timestamp) as last_visit,
          COUNT(*) as page_views,
          COUNT(DISTINCT url) as unique_pages,
          user_agent,
          ip_address
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
        GROUP BY session_id, user_agent, ip_address
        ORDER BY last_visit DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      // Get visitor count
      const totalVisitorsResult = await sql`
        SELECT COUNT(DISTINCT session_id) as count
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${start} AND ${end}
      `;

      res.json({
        success: true,
        data: {
          visitors: visitorsResult.rows,
          total: parseInt(totalVisitorsResult.rows[0].count),
          pagination: {
            limit,
            offset,
            hasMore: offset + limit < parseInt(totalVisitorsResult.rows[0].count)
          }
        }
      });
    } catch (error) {
      logger.error('Error getting visitor analysis:', error);
      throw error;
    }
  })
);

// Helper function to update real-time data
async function updateRealTimeData(websiteId, eventType) {
  try {
    const realtimeData = await getRealTimeData(websiteId) || {
      activeSessions: 0,
      pageViewsLastHour: 0,
      clicksLastHour: 0,
      conversionsLastHour: 0
    };

    // Update counters
    switch (eventType) {
      case 'pageview':
        realtimeData.pageViewsLastHour = await incrementCounter(`pageviews:${websiteId}:hour`);
        break;
      case 'click':
        realtimeData.clicksLastHour = await incrementCounter(`clicks:${websiteId}:hour`);
        break;
      case 'conversion':
        realtimeData.conversionsLastHour = await incrementCounter(`conversions:${websiteId}:hour`);
        break;
    }

    // Update active sessions
    const activeSessionsResult = await sql`
      SELECT COUNT(*) as count
      FROM sessions 
      WHERE website_id = ${websiteId} 
      AND is_active = true 
      AND last_activity > NOW() - INTERVAL '30 minutes'
    `;
    realtimeData.activeSessions = parseInt(activeSessionsResult.rows[0].count);

    // Save to Redis
    await setRealTimeData(websiteId, realtimeData);
  } catch (error) {
    logger.error('Error updating real-time data:', error);
  }
}

module.exports = router;
