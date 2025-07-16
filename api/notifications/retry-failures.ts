import { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailNotificationModel } from '../../backend/src/models/EmailNotification';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const result = await EmailNotificationModel.retryFailedNotifications();
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
  }
} 