import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // ダミーデータ
  const { projectId } = req.query;
  res.status(200).json({
    success: true,
    data: {
      liveVisitors: [
        {
          id: 'dummy-visitor-1',
          projectId,
          sessionId: 'session-1',
          page: '/dashboard',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          ip: '127.0.0.1',
          lastActivity: new Date().toISOString(),
          isActive: true
        }
      ],
      recentPageViews: [
        {
          id: 'pv-1',
          sessionId: 'session-1',
          pageUrl: '/dashboard',
          referrer: '',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          deviceType: 'desktop',
          browser: 'Chrome',
          os: 'macOS',
          timestamp: new Date().toISOString()
        }
      ],
      recentEvents: [
        {
          type: 'click',
          projectId,
          sessionId: 'session-1',
          page: '/dashboard',
          data: {},
          timestamp: new Date().toISOString()
        }
      ]
    }
  });
} 