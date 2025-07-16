import pool from './database';

export class EmailNotificationModel {
  static async findAll(limit: number = 100, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT * FROM email_notifications
      ORDER BY sent_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);
    return result.rows;
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
} 