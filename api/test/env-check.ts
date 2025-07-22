import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const envCheck = {
      SENDGRID_API_KEY: {
        exists: !!process.env.SENDGRID_API_KEY,
        length: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0,
        startsWithSG: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.startsWith('SG.') : false,
        preview: process.env.SENDGRID_API_KEY ? `${process.env.SENDGRID_API_KEY.substring(0, 10)}...` : 'not set'
      },
      FROM_EMAIL: {
        exists: !!process.env.FROM_EMAIL,
        value: process.env.FROM_EMAIL || 'not set'
      },
      FROM_NAME: {
        exists: !!process.env.FROM_NAME,
        value: process.env.FROM_NAME || 'not set'
      },
      NODE_ENV: {
        value: process.env.NODE_ENV || 'not set'
      },
      FRONTEND_URL: {
        exists: !!process.env.FRONTEND_URL,
        value: process.env.FRONTEND_URL || 'not set'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Environment variables check',
      data: envCheck,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check environment variables',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 