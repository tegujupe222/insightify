import { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailNotificationModel } from '../../backend/src/models/EmailNotification';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const stats = await EmailNotificationModel.getStats();
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
  }
} 