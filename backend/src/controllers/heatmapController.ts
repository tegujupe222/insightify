import { Request, Response } from 'express';
import { HeatmapDataModel } from '../models/HeatmapData';
import { ApiResponse } from '../types';

export class HeatmapController {
  // Get heatmap pages for a project
  static async getPages(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const pages = await HeatmapDataModel.getPagesByProject(projectId);
      
      const response: ApiResponse = {
        success: true,
        data: pages,
        message: 'Heatmap pages retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get heatmap pages error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve heatmap pages'
      });
    }
  }

  // Get heatmap data for a specific page
  static async getPageData(req: Request, res: Response) {
    try {
      const { projectId, pageUrl } = req.params;
      const { type = 'click', aggregated = 'false' } = req.query;
      
      let data;
      
      if (aggregated === 'true') {
        data = await HeatmapDataModel.getAggregatedByPage(projectId, pageUrl, type as string);
      } else {
        data = await HeatmapDataModel.getByPage(projectId, pageUrl, type as string);
      }
      
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Heatmap data retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get heatmap page data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve heatmap data'
      });
    }
  }

  // Get heatmap statistics for a project
  static async getProjectStats(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      
      const stats = await HeatmapDataModel.getProjectStats(projectId);
      
      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Heatmap statistics retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get heatmap stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve heatmap statistics'
      });
    }
  }

  // Get element analysis for a page
  static async getElementAnalysis(req: Request, res: Response) {
    try {
      const { projectId, pageUrl } = req.params;
      const { type = 'click' } = req.query;
      
      const analysis = await HeatmapDataModel.getElementAnalysis(projectId, pageUrl, type as string);
      
      const response: ApiResponse = {
        success: true,
        data: analysis,
        message: 'Element analysis retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get element analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve element analysis'
      });
    }
  }

  // Get heatmap data by date range
  static async getDataByDateRange(req: Request, res: Response) {
    try {
      const { projectId, pageUrl } = req.params;
      const { startDate, endDate, type = 'click' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }
      
      const data = await HeatmapDataModel.getByDateRange(
        projectId, 
        pageUrl, 
        new Date(startDate as string), 
        new Date(endDate as string), 
        type as string
      );
      
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Heatmap data by date range retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get heatmap data by date range error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve heatmap data by date range'
      });
    }
  }

  // Delete heatmap data for a page
  static async deletePageData(req: Request, res: Response) {
    try {
      const { projectId, pageUrl } = req.params;
      
      await HeatmapDataModel.deleteByPage(projectId, pageUrl);
      
      const response: ApiResponse = {
        success: true,
        message: 'Heatmap data deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete heatmap data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete heatmap data'
      });
    }
  }

  // Export heatmap data
  static async exportData(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { pageUrl, type } = req.query;
      
      const data = await HeatmapDataModel.exportData(
        projectId, 
        pageUrl as string, 
        type as string
      );
      
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Heatmap data exported successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Export heatmap data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export heatmap data'
      });
    }
  }

  // Get heatmap data for multiple pages
  static async getProjectData(req: Request, res: Response) {
    try {
      const { projectId } = req.params;
      const { type = 'click', limit = '5000' } = req.query;
      
      const data = await HeatmapDataModel.getByProject(
        projectId, 
        type as string, 
        parseInt(limit as string)
      );
      
      const response: ApiResponse = {
        success: true,
        data,
        message: 'Project heatmap data retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get project heatmap data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve project heatmap data'
      });
    }
  }
} 