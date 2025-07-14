import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // const { days = '90' } = req.query; // Not used in mock

    // TODO: Implement actual deletion logic for old notifications
    // For now, return mock data
    const mockResult = {
      deletedCount: 25
    };

    res.status(200).json({
      success: true,
      data: mockResult
    });
  } catch (error) {
    console.error('Delete old notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 