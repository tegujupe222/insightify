import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // TODO: Implement actual heatmap stats data retrieval
    // For now, return mock data
    const mockStats = {
      totalViews: 410,
      totalClicks: 90,
      averageClicksPerPage: 22.5,
      mostClickedElement: 'cta-button',
      clickThroughRate: 0.22
    };

    res.status(200).json({
      success: true,
      data: {
        stats: mockStats
      }
    });
  } catch (error) {
    console.error('Heatmap stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 
