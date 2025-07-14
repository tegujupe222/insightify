import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Implement actual notification stats calculation
    // For now, return mock data
    const mockStats = {
      total: 150,
      sent: 120,
      failed: 15,
      pending: 15,
      byType: {
        upgrade_recommended: 50,
        subscription_requested: 30,
        subscription_activated: 25,
        payment_confirmed: 20,
        limit_warning: 25
      }
    };

    res.status(200).json({
      success: true,
      data: mockStats
    });
  } catch (error) {
    console.error('Notification stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 