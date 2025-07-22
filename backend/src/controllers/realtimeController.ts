import { Request, Response } from 'express';
import { websocketService } from '../services/websocket';
import { AnalyticsModel } from '../models/Analytics';
import { ApiResponse } from '../types';

export class RealtimeController {
  static async getRealtimeData(req: Request, res: Response) {
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

      // Get recent page views (last 30 minutes)
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      const recentPageViews = await AnalyticsModel.getRecentPageViews(projectId, thirtyMinutesAgo);

      // Get recent events (last 30 minutes)
      const recentEvents = await AnalyticsModel.getRecentEvents(projectId, thirtyMinutesAgo);

      const response: ApiResponse = {
        success: true,
        data: {
          liveVisitors,
          liveVisitorCount,
          recentPageViews,
          recentEvents,
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get realtime data error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getLiveVisitorCount(req: Request, res: Response) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      const liveVisitorCount = websocketService.getLiveVisitorCount(projectId);

      const response: ApiResponse = {
        success: true,
        data: { 
          liveVisitorCount,
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get live visitor count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getRecentEvents(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { minutes = '30' } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      const minutesAgo = new Date(Date.now() - parseInt(minutes as string) * 60 * 1000);
      const recentEvents = await AnalyticsModel.getRecentEvents(projectId, minutesAgo);

      const response: ApiResponse = {
        success: true,
        data: { 
          recentEvents,
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get recent events error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getRecentPageViews(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { minutes = '30', limit = '50' } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      const minutesAgo = new Date(Date.now() - parseInt(minutes as string) * 60 * 1000);
      const recentPageViews = await AnalyticsModel.getRecentPageViews(
        projectId, 
        minutesAgo,
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: { 
          recentPageViews,
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get recent page views error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getDetailedLiveVisitors(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { limit = '50' } = req.query;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: 'Project ID is required'
        });
      }

      // Get detailed live visitors with session information
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const detailedVisitors = await AnalyticsModel.getDetailedLiveVisitors(
        projectId, 
        fiveMinutesAgo, 
        parseInt(limit as string)
      );

      const response: ApiResponse = {
        success: true,
        data: { 
          visitors: detailedVisitors,
          count: detailedVisitors.length,
          timestamp: new Date()
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Get detailed live visitors error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 