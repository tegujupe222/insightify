import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// 認証ミドルウェア
const authenticateToken = (req: VercelRequest): AuthUser | null => {
  // Vercel環境とNode.js環境の両方に対応
  const authHeader = (req.headers as any).get ? 
    (req.headers as any).get('authorization') : 
    (req.headers as any)['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 認証チェック
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  const { projectId } = req.query;
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ success: false, error: 'projectIdが必要です' });
  }

  const client = await pool.connect();
  try {
    // プロジェクトの存在と権限チェック
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'プロジェクトが見つかりません' });
    }
    const project = projectResult.rows[0];
    if (user.role !== 'admin' && project.user_id !== user.id) {
      return res.status(403).json({ success: false, error: 'アクセスが拒否されました' });
    }

    // 直近のliveVisitors（例: 5分以内の最新アクセス）
    const liveVisitorsResult = await client.query(
      `SELECT DISTINCT ON (session_id) id, project_id, session_id, page_url as page, user_agent, ip, timestamp as last_activity
       FROM page_views
       WHERE project_id = $1 AND timestamp > NOW() - INTERVAL '5 minutes'
       ORDER BY session_id, timestamp DESC
       LIMIT 20`,
      [projectId]
    );
    const liveVisitors = liveVisitorsResult.rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      sessionId: row.session_id,
      page: row.page,
      userAgent: row.user_agent,
      ip: row.ip,
      lastActivity: row.last_activity,
      isActive: true
    }));

    // recentPageViews（直近20件）
    const recentPageViewsResult = await client.query(
      `SELECT id, session_id, page_url, referrer, user_agent, device_type, browser, os, timestamp
       FROM page_views
       WHERE project_id = $1
       ORDER BY timestamp DESC
       LIMIT 20`,
      [projectId]
    );
    const recentPageViews = recentPageViewsResult.rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      pageUrl: row.page_url,
      referrer: row.referrer,
      userAgent: row.user_agent,
      deviceType: row.device_type,
      browser: row.browser,
      os: row.os,
      timestamp: row.timestamp
    }));

    // recentEvents（直近20件）
    const recentEventsResult = await client.query(
      `SELECT type, project_id, session_id, page, data, timestamp
       FROM events
       WHERE project_id = $1
       ORDER BY timestamp DESC
       LIMIT 20`,
      [projectId]
    );
    const recentEvents = recentEventsResult.rows.map(row => ({
      type: row.type,
      projectId: row.project_id,
      sessionId: row.session_id,
      page: row.page,
      data: row.data,
      timestamp: row.timestamp
    }));

    res.status(200).json({
      success: true,
      data: {
        liveVisitors,
        recentPageViews,
        recentEvents
      }
    });
  } catch (error) {
    console.error('Realtime API error:', error);
    res.status(500).json({ success: false, error: '内部サーバーエラーが発生しました' });
  } finally {
    client.release();
  }
} 