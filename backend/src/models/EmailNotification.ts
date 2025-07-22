import pool from '../config/database';
import { EmailNotification } from '../types';

export class EmailNotificationModel {
  static async create(notificationData: Omit<EmailNotification, 'id' | 'sentAt'>): Promise<EmailNotification> {
    const { userId, type, subject, content } = notificationData;
    
    const query = `
      INSERT INTO email_notifications (user_id, type, subject, content, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, type, subject, content]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<EmailNotification | null> {
    const query = `
      SELECT en.*, u.email as user_email
      FROM email_notifications en
      JOIN users u ON en.user_id = u.id
      WHERE en.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<EmailNotification[]> {
    const query = `
      SELECT en.*, u.email as user_email
      FROM email_notifications en
      JOIN users u ON en.user_id = u.id
      WHERE en.user_id = $1
      ORDER BY en.sent_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByType(type: string): Promise<EmailNotification[]> {
    const query = `
      SELECT en.*, u.email as user_email
      FROM email_notifications en
      JOIN users u ON en.user_id = u.id
      WHERE en.type = $1
      ORDER BY en.sent_at DESC
    `;
    
    const result = await pool.query(query, [type]);
    return result.rows;
  }

  static async findAll(limit: number = 100, offset: number = 0): Promise<EmailNotification[]> {
    const query = `
      SELECT en.*, u.email as user_email
      FROM email_notifications en
      JOIN users u ON en.user_id = u.id
      ORDER BY en.sent_at DESC
      LIMIT $1 OFFSET $2
    `;
    
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
  }

  static async updateStatus(id: string, status: 'pending' | 'sent' | 'failed', errorMessage?: string): Promise<EmailNotification | null> {
    const query = `
      UPDATE email_notifications 
      SET status = $2, error_message = $3, sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id, status, errorMessage]);
    return result.rows[0] || null;
  }

  static async getStats(): Promise<{
    total: number;
    sent: number;
    failed: number;
    pending: number;
    byType: Record<string, number>;
  }> {
    // Get overall stats
    const overallQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM email_notifications
    `;
    
    const overallResult = await pool.query(overallQuery);
    const overall = overallResult.rows[0];

    // Get stats by type
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM email_notifications
      GROUP BY type
      ORDER BY count DESC
    `;
    
    const typeResult = await pool.query(typeQuery);
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
    });

    return {
      total: parseInt(overall.total),
      sent: parseInt(overall.sent),
      failed: parseInt(overall.failed),
      pending: parseInt(overall.pending),
      byType
    };
  }

  static async getRecentFailures(limit: number = 10): Promise<EmailNotification[]> {
    const query = `
      SELECT en.*, u.email as user_email
      FROM email_notifications en
      JOIN users u ON en.user_id = u.id
      WHERE en.status = 'failed'
      ORDER BY en.sent_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async retryFailedNotifications(): Promise<{
    success: number;
    failed: number;
    details: Array<{ id: string; success: boolean; error?: string }>;
  }> {
    const failedNotifications = await this.getRecentFailures(50);
    const results = {
      success: 0,
      failed: 0,
      details: [] as Array<{ id: string; success: boolean; error?: string }>
    };

    for (const notification of failedNotifications) {
      try {
        const { EmailService } = await import('../services/emailService');
        const success = await EmailService.sendNotification(notification);
        
        if (success) {
          await this.updateStatus(notification.id, 'sent');
          results.success++;
          results.details.push({ id: notification.id, success: true });
        } else {
          await this.updateStatus(notification.id, 'failed', 'Retry failed');
          results.failed++;
          results.details.push({ id: notification.id, success: false, error: 'Retry failed' });
        }
      } catch (error) {
        await this.updateStatus(notification.id, 'failed', error instanceof Error ? error.message : 'Unknown error');
        results.failed++;
        results.details.push({ 
          id: notification.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return results;
  }

  static async deleteOldNotifications(daysOld: number = 90): Promise<number> {
    const query = `
      DELETE FROM email_notifications 
      WHERE sent_at < NOW() - INTERVAL '${daysOld} days'
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }
} 