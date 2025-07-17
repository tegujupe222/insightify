import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const client = await pool.connect();
  
  try {
    const { days = '90' } = req.query;
    const daysNum = parseInt(days as string) || 90;
    const query = `
      DELETE FROM email_notifications
      WHERE sent_at < NOW() - INTERVAL '${daysNum} days'
    `;
    const result = await client.query(query);
    const deletedCount = result.rowCount || 0;
    
    res.status(200).json({
      success: true,
      data: { deletedCount },
      message: `${deletedCount} old notifications deleted.`
    });
  } catch (error) {
    console.error('Delete old notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete old notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}
