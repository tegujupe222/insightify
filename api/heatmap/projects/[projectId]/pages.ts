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

    // TODO: Implement actual heatmap pages data retrieval
    // For now, return mock data
    const mockPages = [
      { path: '/', views: 150, clicks: 45 },
      { path: '/about', views: 80, clicks: 12 },
      { path: '/contact', views: 60, clicks: 8 },
      { path: '/products', views: 120, clicks: 25 }
    ];

    res.status(200).json({
      success: true,
      data: {
        pages: mockPages
      }
    });
  } catch (error) {
    console.error('Heatmap pages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 