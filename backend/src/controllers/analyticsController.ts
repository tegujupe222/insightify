import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { AnalyticsModel } from '../models/Analytics';

export class AnalyticsController {
  static async getAnalytics(req: Request, res: Response) {
    try {
      // projectId, 期間をクエリまたはbodyから取得
      const projectId = req.query.projectId || req.body.projectId;
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'projectId is required' });
      }
      // デフォルト: 過去30日
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);

      // 集計データ取得
      const summary = await AnalyticsModel.getSummary(projectId, startDate, endDate);
      const topPages = await AnalyticsModel.getTopPages(projectId, startDate, endDate);
      const sources = await AnalyticsModel.getTrafficSources(projectId, startDate, endDate);
      const deviceData = await AnalyticsModel.getDeviceBreakdown(projectId, startDate, endDate);

      const analyticsData = {
        totalPageViews: summary.totalPageViews,
        uniqueVisitors: summary.uniqueVisitors,
        bounceRate: summary.bounceRate,
        averageSessionDuration: summary.averageSessionDuration,
        topPages,
        topSources: sources,
        deviceBreakdown: deviceData
      };

      const response: ApiResponse = {
        success: true,
        data: analyticsData,
        message: 'Analytics data retrieved successfully'
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
} 