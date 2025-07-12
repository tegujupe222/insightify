import { Request, Response } from 'express';
import { EmailNotificationModel } from '../models/EmailNotification';
import { UserModel } from '../models/User';
import { getEmailTemplates } from '../utils/adminUtils';
import { ApiResponse } from '../types';

export class NotificationController {
  // Get user's notifications
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const notifications = await EmailNotificationModel.findByUserId(userId);

      const response: ApiResponse = {
        success: true,
        data: notifications,
        message: 'Notifications retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get user notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Mark notification as read
  static async markAsRead(req: Request, res: Response) {
    try {
      const { notificationId } = req.params;
      const userId = req.user!.userId;

      const notification = await EmailNotificationModel.findById(notificationId);
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found'
        });
      }

      if (notification.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const updatedNotification = await EmailNotificationModel.markAsRead(notificationId);

      const response: ApiResponse = {
        success: true,
        data: updatedNotification,
        message: 'Notification marked as read'
      };

      res.json(response);
    } catch (error) {
      console.error('Mark notification as read error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Send upgrade recommendation to users near limit
  static async sendUpgradeRecommendations(req: Request, res: Response) {
    try {
      const usersNearLimit = await UserModel.getUsersNearLimit(0.8);
      const templates = getEmailTemplates();
      const template = templates.upgrade_recommended;

      const sentNotifications = [];

      for (const user of usersNearLimit) {
        // Check if we already sent a recommendation recently (within 7 days)
        const recentNotifications = await EmailNotificationModel.findByUserId(user.id);
        const hasRecentRecommendation = recentNotifications.some(
          n => n.type === 'upgrade_recommended' && 
               new Date(n.sentAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
        );

        if (!hasRecentRecommendation) {
          const notification = await EmailNotificationModel.create({
            userId: user.id,
            type: 'upgrade_recommended',
            subject: template.subject,
            content: template.content(user.email, user.monthlyPageViews)
          });

          sentNotifications.push({
            userId: user.id,
            email: user.email,
            notificationId: notification.id
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          sentCount: sentNotifications.length,
          notifications: sentNotifications
        },
        message: `Upgrade recommendations sent to ${sentNotifications.length} users`
      };

      res.json(response);
    } catch (error) {
      console.error('Send upgrade recommendations error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Send limit warnings to users at limit
  static async sendLimitWarnings(req: Request, res: Response) {
    try {
      const usersAtLimit = await UserModel.getUsersAtLimit();
      const templates = getEmailTemplates();
      const template = templates.limit_warning;

      const sentNotifications = [];

      for (const user of usersAtLimit) {
        // Check if we already sent a warning recently (within 3 days)
        const recentNotifications = await EmailNotificationModel.findByUserId(user.id);
        const hasRecentWarning = recentNotifications.some(
          n => n.type === 'limit_warning' && 
               new Date(n.sentAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000
        );

        if (!hasRecentWarning) {
          const notification = await EmailNotificationModel.create({
            userId: user.id,
            type: 'limit_warning',
            subject: template.subject,
            content: template.content(user.email, user.monthlyPageViews, user.pageViewsLimit)
          });

          sentNotifications.push({
            userId: user.id,
            email: user.email,
            notificationId: notification.id
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          sentCount: sentNotifications.length,
          notifications: sentNotifications
        },
        message: `Limit warnings sent to ${sentNotifications.length} users`
      };

      res.json(response);
    } catch (error) {
      console.error('Send limit warnings error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Get all notifications by type
  static async getNotificationsByType(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const notifications = await EmailNotificationModel.findByType(type);

      const response: ApiResponse = {
        success: true,
        data: notifications,
        message: `Notifications of type ${type} retrieved successfully`
      };

      res.json(response);
    } catch (error) {
      console.error('Get notifications by type error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Delete old notifications
  static async deleteOldNotifications(req: Request, res: Response) {
    try {
      const { daysToKeep = 30 } = req.body;
      const deletedCount = await EmailNotificationModel.deleteOldNotifications(daysToKeep);

      const response: ApiResponse = {
        success: true,
        data: {
          deletedCount
        },
        message: `${deletedCount} old notifications deleted`
      };

      res.json(response);
    } catch (error) {
      console.error('Delete old notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 