import { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { EmailNotificationModel } from '../models/EmailNotification';
import { EmailService } from '../services/emailService';
import { getEmailTemplates } from '../utils/adminUtils';
import { ApiResponse } from '../types';

export class NotificationController {
  // Get all notifications with pagination
  static async getAllNotifications(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = (page - 1) * limit;

      const notifications = await EmailNotificationModel.findAll(limit, offset);

      const response: ApiResponse = {
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            offset
          }
        },
        message: 'Notifications retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get notification statistics
  static async getNotificationStats(_req: Request, res: Response) {
    try {
      const stats = await EmailNotificationModel.getStats();

      const response: ApiResponse = {
        success: true,
        data: stats,
        message: 'Notification statistics retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get notification stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get recent failed notifications
  static async getRecentFailures(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const failures = await EmailNotificationModel.getRecentFailures(limit);

      const response: ApiResponse = {
        success: true,
        data: {
          failures,
          count: failures.length
        },
        message: 'Recent failures retrieved successfully'
      };

      res.json(response);
    } catch (error) {
      console.error('Get recent failures error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Retry failed notifications
  static async retryFailedNotifications(_req: Request, res: Response) {
    try {
      const results = await EmailNotificationModel.retryFailedNotifications();

      const response: ApiResponse = {
        success: true,
        data: results,
        message: `Retry completed. Success: ${results.success}, Failed: ${results.failed}`
      };

      res.json(response);
    } catch (error) {
      console.error('Retry failed notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Send test email
  static async sendTestEmail(req: Request, res: Response) {
    try {
      const { email, subject, content } = req.body;

      if (!email || !subject || !content) {
        return res.status(400).json({
          success: false,
          error: 'Email, subject, and content are required'
        });
      }

      const success = await EmailService.sendEmail(email, subject, content);

      const response: ApiResponse = {
        success: true,
        data: {
          sent: success,
          email,
          subject
        },
        message: success ? 'Test email sent successfully' : 'Failed to send test email'
      };

      res.json(response);
    } catch (error) {
      console.error('Send test email error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Send bulk notifications
  static async sendBulkNotifications(req: Request, res: Response) {
    try {
      const { userIds, type, subject, content } = req.body;

      if (!userIds || !Array.isArray(userIds) || !type || !subject || !content) {
        return res.status(400).json({
          success: false,
          error: 'User IDs array, type, subject, and content are required'
        });
      }

      const notifications = [];
      const results = {
        success: 0,
        failed: 0,
        details: [] as Array<{ userId: string; success: boolean; error?: string }>
      };

      for (const userId of userIds) {
        try {
          // Create notification record
          const notification = await EmailNotificationModel.create({
            userId,
            type,
            subject,
            content
          });

          // Send email
          const success = await EmailService.sendNotification(notification);
          
          if (success) {
            await EmailNotificationModel.updateStatus(notification.id, 'sent');
            results.success++;
            results.details.push({ userId, success: true });
          } else {
            await EmailNotificationModel.updateStatus(notification.id, 'failed', 'Send failed');
            results.failed++;
            results.details.push({ userId, success: false, error: 'Send failed' });
          }

          notifications.push(notification);
        } catch (error) {
          results.failed++;
          results.details.push({ 
            userId, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          total: userIds.length,
          ...results,
          notifications
        },
        message: `Bulk notifications sent. Success: ${results.success}, Failed: ${results.failed}`
      };

      res.json(response);
    } catch (error) {
      console.error('Send bulk notifications error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Admin: Send upgrade recommendation to users near limit
  static async sendUpgradeRecommendations(_req: Request, res: Response) {
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

          // Send email and update status
          const success = await EmailService.sendUpgradeRecommendation(user.email, user.monthlyPageViews);
          await EmailNotificationModel.updateStatus(
            notification.id, 
            success ? 'sent' : 'failed',
            success ? undefined : 'Send failed'
          );

          sentNotifications.push({
            userId: user.id,
            email: user.email,
            notificationId: notification.id,
            success
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
  static async sendLimitWarnings(_req: Request, res: Response) {
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

          // Send email and update status
          const success = await EmailService.sendLimitWarning(user.email, user.monthlyPageViews, user.pageViewsLimit);
          await EmailNotificationModel.updateStatus(
            notification.id, 
            success ? 'sent' : 'failed',
            success ? undefined : 'Send failed'
          );

          sentNotifications.push({
            userId: user.id,
            email: user.email,
            notificationId: notification.id,
            success
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

  // Delete old notifications
  static async deleteOldNotifications(req: Request, res: Response) {
    try {
      const daysOld = parseInt(req.query.days as string) || 90;
      const deletedCount = await EmailNotificationModel.deleteOldNotifications(daysOld);

      const response: ApiResponse = {
        success: true,
        data: {
          deletedCount
        },
        message: `Deleted ${deletedCount} notifications older than ${daysOld} days`
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
