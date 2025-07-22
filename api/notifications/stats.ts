import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const client = await pool.connect();
  
  try {
    // Get overall stats
    const overallQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM email_notifications
    `;
    const overallResult = await client.query(overallQuery);
    const overall = overallResult.rows[0];

    // Get stats by type
    const typeQuery = `
      SELECT type, COUNT(*) as count
      FROM email_notifications
      GROUP BY type
      ORDER BY count DESC
    `;
    const typeResult = await client.query(typeQuery);
    const byType: Record<string, number> = {};
    typeResult.rows.forEach(row => {
      byType[row.type] = parseInt(row.count);
    });

    const stats = {
      total: parseInt(overall.total),
      sent: parseInt(overall.sent),
      failed: parseInt(overall.failed),
      pending: parseInt(overall.pending),
      byType
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'Notification stats fetched successfully'
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notification stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}