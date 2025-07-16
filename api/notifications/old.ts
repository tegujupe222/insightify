import { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailNotificationModel } from '../../backend/src/models/EmailNotification';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { days = '90' } = req.query;
    const daysNum = parseInt(days as string) || 90;
    const deletedCount = await EmailNotificationModel.deleteOldNotifications(daysNum);
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
  }
} 