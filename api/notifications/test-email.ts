import { VercelRequest, VercelResponse } from '@vercel/node';

const sgMail = require('@sendgrid/mail');

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

  try {
    const { email, subject, content } = req.body;
    if (!email || !subject || !content) {
      return res.status(400).json({
        success: false,
        error: 'Email, subject, and content are required'
      });
    }
    const sent = await sendEmail(email, subject, content);
    res.status(200).json({
      success: true,
      data: { sent },
      message: sent ? 'Test email sent successfully' : 'Failed to send test email'
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 