import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { ApiResponse } from '../types';

export class UserController {
  // Get all users (admin only)
  static async getAllUsers(_req: Request, res: Response) {
    try {
      const users = await UserModel.findAll();
      
      const response: ApiResponse = {
        success: true,
        data: { users },
        message: 'Users retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user has access to this user data
      if ((req.user as any)!.role !== 'admin' && (req.user as any)!.id !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'User retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Update user (self or admin)
  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user has permission to update
      if ((req.user as any)!.role !== 'admin' && (req.user as any)!.id !== id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      // Non-admin users can only update certain fields
      if ((req.user as any)!.role !== 'admin') {
        const allowedFields = ['email']; // Add more fields as needed
        const filteredUpdates: any = {};
        
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            filteredUpdates[field] = updates[field];
          }
        }
        
        Object.assign(updates, filteredUpdates);
      }

      const updatedUser = await UserModel.update(id, updates);
      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update user'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { user: updatedUser },
        message: 'User updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Delete user (admin only)
  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent admin from deleting themselves
      if ((req.user as any)!.id === id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete your own account'
        });
      }

      const deleted = await UserModel.delete(id);
      if (!deleted) {
        return res.status(400).json({
          success: false,
          error: 'Failed to delete user'
        });
      }

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Ban/Unban user (admin only)
  static async toggleUserBan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isBanned } = req.body;

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent admin from banning themselves
      if ((req.user as any)!.id === id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot ban your own account'
        });
      }

      const updates: any = {
        isBanned: isBanned,
        bannedAt: isBanned ? new Date() : null
      };

      const updatedUser = await UserModel.update(id, updates);
      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update user ban status'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { user: updatedUser },
        message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`
      };

      res.json(response);
    } catch (error) {
      console.error('Toggle user ban error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Change user role (admin only)
  static async changeUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role'
        });
      }

      const user = await UserModel.findById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Prevent admin from changing their own role
      if ((req.user as any)!.id === id) {
        return res.status(400).json({
          success: false,
          error: 'Cannot change your own role'
        });
      }

      const updatedUser = await UserModel.update(id, { role });
      if (!updatedUser) {
        return res.status(400).json({
          success: false,
          error: 'Failed to update user role'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: { user: updatedUser },
        message: 'User role updated successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Change user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 