import { VercelRequest, VercelResponse } from '@vercel/node;
import { Pool } frompg';
import { sendEmail } from './emailService';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse)object Object]if (req.method !== 'POST') {
    return res.status(405n({ success: false, error: 'Method not allowed }); }

  const client = await pool.connect();
  
  try [object Object]    // 失敗した通知を取得
    const failedQuery = `SELECT * FROM email_notifications WHERE status = 'failed'`;
    const failedResult = await client.query(failedQuery);
    let success =0;
    let failed =0   
    for (const n of failedResult.rows) [object Object]      const sent = await sendEmail(n.user_email, n.subject, n.content);
      if (sent)[object Object]       success++;
        await client.query(`UPDATE email_notifications SET status = 'sent, error_message = NULL, sent_at = NOW() WHERE id = $1, [n.id]);
      } else {
        failed++;
        await client.query(`UPDATE email_notifications SET error_message = $1 WHERE id = $2, ['Retry failed', n.id]);
      }
    }
    
    const result = { success, failed };
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Retry completed. Success: ${result.success}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error('Retry failed notifications error:, error);
    res.status(500).json({
      success: false,
      error:Failed to retry failed notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
} 