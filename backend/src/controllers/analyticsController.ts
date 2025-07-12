import { Request, Response } from 'express';
import { AnalyticsModel } from '../models/Analytics';
import { ApiResponse } from '../types';
import { websocketService } from '../services/websocket';

export class AnalyticsController {
  static async trackBatch(req: Request, res: Response) {
    try {
      const { projectId, pageViews = [], events = [], heatmapData = [] } = req.body;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Process page views
      if (pageViews.length > 0) {
        await AnalyticsModel.createPageViews(pageViews);
        
        // Broadcast page views to WebSocket clients
        pageViews.forEach((pageView: any) => {
          websocketService.broadcastPageView(projectId, pageView);
        });
      }

      // Process events
      if (events.length > 0) {
        await AnalyticsModel.createEvents(events);
        
        // Broadcast events to WebSocket clients
        events.forEach((event: any) => {
          websocketService.broadcastEvent(projectId, {
            type: event.eventType,
            projectId,
            sessionId: event.sessionId,
            page: event.page,
            data: event.eventData,
            timestamp: new Date()
          });
        });
      }

      // Process heatmap data
      if (heatmapData.length > 0) {
        const { HeatmapDataModel } = await import('../models/HeatmapData');
        
        for (const heatmap of heatmapData) {
          await HeatmapDataModel.create({
            projectId: heatmap.projectId,
            pageUrl: heatmap.pageUrl,
            pageTitle: heatmap.pageTitle,
            x: heatmap.x,
            y: heatmap.y,
            heatmapType: heatmap.heatmapType || 'click',
            elementSelector: heatmap.elementSelector,
            elementText: heatmap.elementText
          });
        }
        
        // Broadcast heatmap data to WebSocket clients
        heatmapData.forEach((heatmap: any) => {
          websocketService.broadcastHeatmapData(projectId, heatmap);
        });
      }

      // Update session data
      if (pageViews.length > 0 || events.length > 0) {
        await AnalyticsModel.updateSessionData(projectId, pageViews, events);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Analytics data received successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Track batch error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getAnalytics(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { startDate, endDate, period = '30d' } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Calculate date range
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get analytics summary
      const summary = await AnalyticsModel.getSummary(projectId, start, end);
      
      // Get time series data
      const timeSeries = await AnalyticsModel.getTimeSeriesData(projectId, start, end, period as string);
      
      // Get top pages
      const topPages = await AnalyticsModel.getTopPages(projectId, start, end);
      
      // Get traffic sources
      const trafficSources = await AnalyticsModel.getTrafficSources(projectId, start, end);
      
      // Get device breakdown
      const deviceBreakdown = await AnalyticsModel.getDeviceBreakdown(projectId, start, end);

      const response: ApiResponse = {
        success: true,
        data: {
          summary,
          timeSeries,
          topPages,
          trafficSources,
          deviceBreakdown
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getFilteredAnalytics(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { 
        startDate, 
        endDate, 
        period = '30d',
        pageUrl,
        eventType,
        deviceType,
        browser,
        referrer,
        limit = '100'
      } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Calculate date range
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Build filter conditions
      const filters: any = {};
      if (pageUrl) filters.pageUrl = pageUrl as string;
      if (eventType) filters.eventType = eventType as string;
      if (deviceType) filters.deviceType = deviceType as string;
      if (browser) filters.browser = browser as string;
      if (referrer) filters.referrer = referrer as string;

      // Get filtered analytics data
      const filteredData = await AnalyticsModel.getFilteredData(
        projectId, 
        start, 
        end, 
        filters, 
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: {
          pageViews: filteredData.pageViews,
          events: filteredData.events,
          sessions: filteredData.sessions,
          filters,
          dateRange: { start, end }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get filtered analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getHeatmap(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { pageUrl, startDate, endDate } = req.query;

      if (!projectId || !pageUrl) {
        return res.status(400).json({
          success: false,
          error: 'Project ID and page URL are required'
        });
      }

      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      const heatmapData = await AnalyticsModel.getHeatmapData(
        projectId, 
        pageUrl as string, 
        start, 
        end
      );

      const response: ApiResponse = {
        success: true,
        data: { heatmapData }
      };

      res.json(response);
    } catch (error) {
      console.error('Get heatmap error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getLiveVisitors(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Get live visitors from WebSocket service
      const liveVisitors = websocketService.getLiveVisitors(projectId);
      const liveVisitorCount = websocketService.getLiveVisitorCount(projectId);

      const response: ApiResponse = {
        success: true,
        data: { 
          liveVisitors,
          liveVisitorCount
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get live visitors error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async exportData(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { 
        type = 'pageviews',
        format = 'csv',
        startDate, 
        endDate,
        filters = {}
      } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Calculate date range
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get data for export
      const exportData = await AnalyticsModel.getExportData(
        projectId,
        type as string,
        start,
        end,
        filters as any
      );

      if (format === 'csv') {
        const csv = AnalyticsModel.convertToCSV(exportData, type as string);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-${projectId}-${start.toISOString().split('T')[0]}.csv"`);
        res.send(csv);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${type}-${projectId}-${start.toISOString().split('T')[0]}.json"`);
        res.json(exportData);
      }
    } catch (error) {
      console.error('Export data error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getCustomEvents(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { startDate, endDate, limit = '100' } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Calculate date range
      const end = endDate ? new Date(endDate as string) : new Date();
      const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get custom events (excluding system events like pageview, click, scroll)
      const customEvents = await AnalyticsModel.getCustomEvents(
        projectId,
        start,
        end,
        parseInt(limit as string)
      );

      // Get event types summary
      const eventTypes = await AnalyticsModel.getEventTypesSummary(projectId, start, end);

      const response: ApiResponse = {
        success: true,
        data: {
          customEvents,
          eventTypes,
          dateRange: { start, end }
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get custom events error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 