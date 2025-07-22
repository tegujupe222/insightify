import { VercelRequest, VercelResponse } from '@vercel/node';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@insightify.com';
const FROM_NAME = process.env.FROM_NAME || 'Insightify Team';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { to, subject, content } = req.body;
    
    if (!to || !subject || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'To, subject, and content are required' 
      });
    }

    // SendGrid APIキーが設定されているかチェック
    if (!SENDGRID_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'SendGrid API key not configured',
        config: {
          hasApiKey: false,
          fromEmail: FROM_EMAIL,
          fromName: FROM_NAME
        }
      });
    }

    // メール送信
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      text: content,
      html: `
        <!DOCTYPE html>
        <html lang="ja">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 20px;
              background-color: #f9fafb;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: white;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 600;
            }
            .content {
              padding: 40px 30px;
            }
            .footer {
              background-color: #f9fafb;
              padding: 20px;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Insightify</h1>
            </div>
            <div class="content">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>Insightify Analytics Platform</p>
              <p>このメールは自動送信されています</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await sgMail.send(msg);

    res.status(200).json({
      success: true,
      message: 'Test email sent successfully',
      data: {
        to,
        subject,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        config: {
          hasApiKey: true,
          fromEmail: FROM_EMAIL,
          fromName: FROM_NAME
        }
      }
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error',
      config: {
        hasApiKey: !!SENDGRID_API_KEY,
        fromEmail: FROM_EMAIL,
        fromName: FROM_NAME
      }
    });
  }
} 
