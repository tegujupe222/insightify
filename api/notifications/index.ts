import { VercelRequest, VercelResponse } from '@vercel/node';
import { EmailNotificationModel } from '../../backend/src/models/EmailNotification';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { limit = '50', type, status } = req.query;
    const limitNum = parseInt(limit as string) || 50;

    // DBから通知履歴を取得
    let notifications: any[] = await EmailNotificationModel.findAll(limitNum, 0);

    // フィルタリング（snake_caseでアクセス）
    if (type && type !== 'all') {
      notifications = notifications.filter(n => n.type === type);
    }
    if (status && status !== 'all') {
      notifications = notifications.filter(n => n.status === status);
    }

    // 整形（snake_caseで返す）
    const notificationsData = notifications.map(n => ({
      id: n.id,
      user_id: n.user_id,
      user_email: n.user_email,
      type: n.type,
      subject: n.subject,
      content: n.content,
      status: n.status,
      error_message: n.error_message,
      sent_at: n.sent_at
    }));

    res.status(200).json({
      success: true,
      data: {
        notifications: notificationsData
      }
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 