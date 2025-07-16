import { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailService } from '../../backend/src/services/emailService';

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
    const sent = await EmailService.sendEmail(email, subject, content);
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