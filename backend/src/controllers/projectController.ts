import { Request, Response } from 'express';
import { ProjectModel } from '../models/Project';
import { ProjectCreateInput, ApiResponse, PaginatedResponse } from '../types';

export class ProjectController {
  static async create(req: Request, res: Response) {
    try {
      const projectData: ProjectCreateInput = {
        ...req.body,
        userId: req.user!.userId
      };

      // Validate domains if provided
      if (projectData.domains && !Array.isArray(projectData.domains)) {
        return res.status(400).json({
          success: false,
          error: 'Domains must be an array'
        });
      }

      const project = await ProjectModel.create(projectData);

      const response: ApiResponse = {
        success: true,
        data: { project },
        message: 'Project created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Create project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);

      let projects;
      if (req.user!.role === 'admin') {
        projects = await ProjectModel.findAll();
      } else {
        projects = await ProjectModel.findByUserId(req.user!.userId);
      }

      // Simple pagination
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = pageNum * limitNum;
      const paginatedProjects = projects.slice(startIndex, endIndex);

      const response: PaginatedResponse<any> = {
        data: paginatedProjects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: projects.length,
          totalPages: Math.ceil(projects.length / limitNum)
        }
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Get projects error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const project = await ProjectModel.findById(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user has access to this project
      if (req.user!.role !== 'admin' && project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { project }
      };

      res.json(response);
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user has access to this project
      if (req.user!.role !== 'admin' && project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedProject = await ProjectModel.update(id, updates);
      if (!updatedProject) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update project'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { project: updatedProject },
        message: 'Project updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user has access to this project
      if (req.user!.role !== 'admin' && project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const deleted = await ProjectModel.delete(id);
      if (!deleted) {
        return res.status(400).json({
          success: false,
          error: 'Failed to delete project'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'Project deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async toggleActive(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user has access to this project
      if (req.user!.role !== 'admin' && project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedProject = await ProjectModel.toggleActive(id);
      if (!updatedProject) {
        return res.status(400).json({
          success: false,
          error: 'Failed to toggle project status'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { project: updatedProject },
        message: `Project ${updatedProject.isActive ? 'activated' : 'deactivated'} successfully`
      };

      res.json(response);
    } catch (error) {
      console.error('Toggle project error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  static async regenerateTrackingCode(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }

      // Check if user has access to this project
      if (req.user!.role !== 'admin' && project.userId !== req.user!.userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedProject = await ProjectModel.regenerateTrackingCode(id);
      if (!updatedProject) {
        return res.status(400).json({
          success: false,
          error: 'Failed to regenerate tracking code'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { project: updatedProject },
        message: 'Tracking code regenerated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Regenerate tracking code error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 