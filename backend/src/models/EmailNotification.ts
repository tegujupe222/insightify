import pool from '../config/database';
import { EmailNotification } from '../types';

export class EmailNotificationModel {
  static async create(notificationData: Omit<EmailNotification, 'id' | 'sentAt'>): Promise<EmailNotification> {
    const { userId, type, subject, content } = notificationData;
    
    const query = `
      INSERT INTO email_notifications (user_id, type, subject, content)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await pool.query(query, [userId, type, subject, content]);
    return result.rows[0];
  }

  static async findById(id: string): Promise<EmailNotification | null> {
    const query = 'SELECT * FROM email_notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: string): Promise<EmailNotification[]> {
    const query = 'SELECT * FROM email_notifications WHERE user_id = $1 ORDER BY sent_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async findByType(type: string): Promise<EmailNotification[]> {
    const query = 'SELECT * FROM email_notifications WHERE type = $1 ORDER BY sent_at DESC';
    const result = await pool.query(query, [type]);
    return result.rows;
  }

  static async markAsRead(id: string): Promise<EmailNotification | null> {
    const query = `
      UPDATE email_notifications 
      SET read_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM email_notifications WHERE id = $1';
    const result = await pool.query(query, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async deleteOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const query = 'DELETE FROM email_notifications WHERE sent_at < $1';
    const result = await pool.query(query, [cutoffDate]);
    return result.rowCount || 0;
  }
} 