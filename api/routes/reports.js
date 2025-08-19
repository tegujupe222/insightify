const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { sql } = require('../database/connection');
const { verifyToken, requireWebsiteOwnership } = require('../middleware/auth');
const { asyncHandler, validateRequest, validateQuery } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// Validation schemas
const createReportSchema = Joi.object({
  websiteId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).required(),
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'custom').required(),
  dateRange: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required()
  }).required(),
  settings: Joi.object({
    includePageViews: Joi.boolean().default(true),
    includeClicks: Joi.boolean().default(true),
    includeConversions: Joi.boolean().default(true),
    includeHeatmaps: Joi.boolean().default(false),
    includeABTests: Joi.boolean().default(false),
    includeFunnels: Joi.boolean().default(false),
    format: Joi.string().valid('json', 'csv', 'pdf').default('json')
  }).default({})
});

const reportQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'custom'),
  status: Joi.string().valid('pending', 'generating', 'completed', 'failed')
});

// GET /api/reports - Get user's reports
router.get('/',
  verifyToken,
  validateQuery(reportQuerySchema),
  asyncHandler(async (req, res) => {
    const { limit, offset, type, status } = req.validatedQuery;
    
    try {
      let query = sql`
        SELECT r.id, r.name, r.type, r.date_range, r.status, r.created_at, r.generated_at,
               w.name as website_name, w.url as website_url
        FROM reports r
        JOIN websites w ON r.website_id = w.id
        WHERE r.user_id = ${req.user.id}
      `;
      
      if (type) {
        query = sql`${query} AND r.type = ${type}`;
      }
      
      if (status) {
        query = sql`${query} AND r.status = ${status}`;
      }
      
      query = sql`${query} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      
      const result = await query;
      
      // Get total count
      let countQuery = sql`
        SELECT COUNT(*) as total
        FROM reports r
        WHERE r.user_id = ${req.user.id}
      `;
      
      if (type) {
        countQuery = sql`${countQuery} AND r.type = ${type}`;
      }
      
      if (status) {
        countQuery = sql`${countQuery} AND r.status = ${status}`;
      }
      
      const countResult = await countQuery;
      const total = parseInt(countResult.rows[0].total);
      
      res.json({
        success: true,
        data: {
          reports: result.rows,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        }
      });
    } catch (error) {
      logger.error('Error getting reports:', error);
      throw error;
    }
  })
);

// POST /api/reports - Create new report
router.post('/',
  verifyToken,
  validateRequest(createReportSchema),
  asyncHandler(async (req, res) => {
    const { websiteId, name, type, dateRange, settings } = req.validatedBody;
    
    try {
      // Verify website ownership
      const websiteResult = await sql`
        SELECT id, name FROM websites WHERE id = ${websiteId} AND user_id = ${req.user.id}
      `;
      
      if (websiteResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Website access denied'
        });
      }
      
      // Create report
      const result = await sql`
        INSERT INTO reports (
          user_id, website_id, name, type, date_range, settings, status, created_at
        ) VALUES (
          ${req.user.id}, ${websiteId}, ${name}, ${type}, ${dateRange}, ${settings}, 'pending', NOW()
        ) RETURNING id, name, type, date_range, status, created_at
      `;
      
      const report = result.rows[0];
      
      // Generate report in background
      generateReport(report.id, websiteId, dateRange, settings);
      
      logger.info(`Report created: ${name} by user ${req.user.email}`);
      
      res.status(201).json({
        success: true,
        message: 'Report created successfully',
        data: {
          report: {
            id: report.id,
            name: report.name,
            type: report.type,
            dateRange: report.date_range,
            status: report.status,
            createdAt: report.created_at
          }
        }
      });
    } catch (error) {
      logger.error('Error creating report:', error);
      throw error;
    }
  })
);

// GET /api/reports/:id - Get report details
router.get('/:id',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await sql`
        SELECT r.id, r.name, r.type, r.date_range, r.data, r.status, r.created_at, r.generated_at,
               w.name as website_name, w.url as website_url
        FROM reports r
        JOIN websites w ON r.website_id = w.id
        WHERE r.id = ${id} AND r.user_id = ${req.user.id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      const report = result.rows[0];
      
      res.json({
        success: true,
        data: {
          report: {
            id: report.id,
            name: report.name,
            type: report.type,
            dateRange: report.date_range,
            data: report.data,
            status: report.status,
            createdAt: report.created_at,
            generatedAt: report.generated_at,
            website: {
              name: report.website_name,
              url: report.website_url
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error getting report details:', error);
      throw error;
    }
  })
);

// DELETE /api/reports/:id - Delete report
router.delete('/:id',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await sql`
        DELETE FROM reports WHERE id = ${id} AND user_id = ${req.user.id}
      `;
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      logger.info(`Report deleted: ${id} by user ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Report deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting report:', error);
      throw error;
    }
  })
);

// POST /api/reports/:id/regenerate - Regenerate report
router.post('/:id/regenerate',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    try {
      const result = await sql`
        SELECT r.id, r.website_id, r.name, r.type, r.date_range, r.settings
        FROM reports r
        WHERE r.id = ${id} AND r.user_id = ${req.user.id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      const report = result.rows[0];
      
      // Update status to pending
      await sql`
        UPDATE reports SET status = 'pending', generated_at = NULL WHERE id = ${id}
      `;
      
      // Regenerate report in background
      generateReport(report.id, report.website_id, report.date_range, report.settings);
      
      logger.info(`Report regeneration started: ${report.name}`);
      
      res.json({
        success: true,
        message: 'Report regeneration started'
      });
    } catch (error) {
      logger.error('Error regenerating report:', error);
      throw error;
    }
  })
);

// GET /api/reports/:id/export - Export report
router.get('/:id/export',
  verifyToken,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    try {
      const result = await sql`
        SELECT r.id, r.name, r.type, r.date_range, r.data, r.status,
               w.name as website_name
        FROM reports r
        JOIN websites w ON r.website_id = w.id
        WHERE r.id = ${id} AND r.user_id = ${req.user.id}
      `;
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Report not found'
        });
      }
      
      const report = result.rows[0];
      
      if (report.status !== 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Report not ready for export'
        });
      }
      
      let exportData;
      let contentType;
      let filename;
      
      switch (format) {
        case 'csv':
          exportData = generateCSV(report.data);
          contentType = 'text/csv';
          filename = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
          break;
        case 'json':
        default:
          exportData = JSON.stringify(report.data, null, 2);
          contentType = 'application/json';
          filename = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
          break;
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
      
    } catch (error) {
      logger.error('Error exporting report:', error);
      throw error;
    }
  })
);

// Background function to generate report
async function generateReport(reportId, websiteId, dateRange, settings) {
  try {
    // Update status to generating
    await sql`
      UPDATE reports SET status = 'generating' WHERE id = ${reportId}
    `;
    
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    // Generate report data
    const reportData = await generateReportData(websiteId, startDate, endDate, settings);
    
    // Update report with data
    await sql`
      UPDATE reports 
      SET data = ${reportData}, status = 'completed', generated_at = NOW()
      WHERE id = ${reportId}
    `;
    
    logger.info(`Report generated successfully: ${reportId}`);
    
  } catch (error) {
    logger.error('Error generating report:', error);
    
    // Update status to failed
    await sql`
      UPDATE reports SET status = 'failed' WHERE id = ${reportId}
    `;
  }
}

// Generate report data
async function generateReportData(websiteId, startDate, endDate, settings) {
  const data = {
    summary: {},
    pageViews: [],
    clicks: [],
    conversions: [],
    topPages: [],
    deviceBreakdown: [],
    trafficSources: []
  };
  
  try {
    // Get summary data
    if (settings.includePageViews) {
      const pageViewsResult = await sql`
        SELECT COUNT(*) as count, COUNT(DISTINCT session_id) as unique_sessions
        FROM page_views 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${startDate} AND ${endDate}
      `;
      
      data.summary.pageViews = parseInt(pageViewsResult.rows[0].count);
      data.summary.uniqueSessions = parseInt(pageViewsResult.rows[0].unique_sessions);
    }
    
    if (settings.includeClicks) {
      const clicksResult = await sql`
        SELECT COUNT(*) as count
        FROM click_events 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${startDate} AND ${endDate}
      `;
      
      data.summary.clicks = parseInt(clicksResult.rows[0].count);
    }
    
    if (settings.includeConversions) {
      const conversionsResult = await sql`
        SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
        FROM conversion_events 
        WHERE website_id = ${websiteId} 
        AND timestamp BETWEEN ${startDate} AND ${endDate}
      `;
      
      data.summary.conversions = parseInt(conversionsResult.rows[0].count);
      data.summary.totalValue = parseFloat(conversionsResult.rows[0].total_value);
    }
    
    // Get top pages
    const topPagesResult = await sql`
      SELECT url, page_title, COUNT(*) as views
      FROM page_views 
      WHERE website_id = ${websiteId} 
      AND timestamp BETWEEN ${startDate} AND ${endDate}
      GROUP BY url, page_title
      ORDER BY views DESC
      LIMIT 10
    `;
    
    data.topPages = topPagesResult.rows;
    
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
      AND timestamp BETWEEN ${startDate} AND ${endDate}
      GROUP BY device_type
      ORDER BY count DESC
    `;
    
    data.deviceBreakdown = deviceResult.rows;
    
    return data;
    
  } catch (error) {
    logger.error('Error generating report data:', error);
    throw error;
  }
}

// Generate CSV from report data
function generateCSV(data) {
  const rows = [];
  
  // Add summary
  rows.push(['Metric', 'Value']);
  rows.push(['Page Views', data.summary.pageViews || 0]);
  rows.push(['Unique Sessions', data.summary.uniqueSessions || 0]);
  rows.push(['Clicks', data.summary.clicks || 0]);
  rows.push(['Conversions', data.summary.conversions || 0]);
  rows.push(['Total Value', data.summary.totalValue || 0]);
  rows.push([]);
  
  // Add top pages
  if (data.topPages && data.topPages.length > 0) {
    rows.push(['Top Pages']);
    rows.push(['URL', 'Page Title', 'Views']);
    data.topPages.forEach(page => {
      rows.push([page.url, page.page_title, page.views]);
    });
    rows.push([]);
  }
  
  // Add device breakdown
  if (data.deviceBreakdown && data.deviceBreakdown.length > 0) {
    rows.push(['Device Breakdown']);
    rows.push(['Device Type', 'Count']);
    data.deviceBreakdown.forEach(device => {
      rows.push([device.device_type, device.count]);
    });
  }
  
  return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

module.exports = router;
