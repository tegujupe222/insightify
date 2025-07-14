import { VercelRequest, VercelResponse } from '@vercel/node';

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
    
    // TODO: Implement actual notifications data retrieval
    // For now, return mock data
    const mockNotifications = [
      {
        id: '1',
        userEmail: 'user1@example.com',
        type: 'upgrade_recommended',
        subject: 'アップグレード推奨',
        status: 'sent',
        sentAt: new Date().toISOString(),
        errorMessage: null
      },
      {
        id: '2',
        userEmail: 'user2@example.com',
        type: 'subscription_requested',
        subject: 'サブスクリプション申し込み',
        status: 'pending',
        sentAt: null,
        errorMessage: null
      }
    ];

    let filteredNotifications = mockNotifications;

    // Apply filters
    if (type && type !== 'all') {
      filteredNotifications = filteredNotifications.filter(n => n.type === type);
    }
    if (status && status !== 'all') {
      filteredNotifications = filteredNotifications.filter(n => n.status === status);
    }

    // Apply limit
    const limitNum = parseInt(limit as string) || 50;
    filteredNotifications = filteredNotifications.slice(0, limitNum);

    res.status(200).json({
      success: true,
      data: {
        notifications: filteredNotifications
      }
    });
  } catch (error) {
    console.error('Notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 