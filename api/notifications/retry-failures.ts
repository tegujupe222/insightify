import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const sgMail = require('@sendgrid/mail');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@insightify.com';
const FROM_NAME = process.env.FROM_NAME || 'Insightify Team';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

async function sendEmail(to: string, subject: string, content: string, htmlContent?: string): Promise<boolean> {
  try {
    if (!SENDGRID_API_KEY) {
      console.warn('SendGrid API key not configured, skipping email send');
      return false;
    }

    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      text: content,
      html: htmlContent || `<pre>${content}</pre>`
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const client = await pool.connect();
  
  try {
    // 失敗した通知を取得
    const failedQuery = `SELECT * FROM email_notifications WHERE status = 'failed'`;
    const failedResult = await client.query(failedQuery);
    let success = 0;
    let failed = 0;
    
    for (const n of failedResult.rows) {
      const sent = await sendEmail(n.user_email, n.subject, n.content);
      if (sent) {
        success++;
        await client.query(`UPDATE email_notifications SET status = 'sent', error_message = NULL, sent_at = NOW() WHERE id = $1`, [n.id]);
      } else {
        failed++;
        await client.query(`UPDATE email_notifications SET error_message = $1 WHERE id = $2`, ['Retry failed', n.id]);
      }
    }
    
    const result = { success, failed };
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Retry completed. Success: ${result.success}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error('Retry failed notifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry failed notifications',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    client.release();
  }
}