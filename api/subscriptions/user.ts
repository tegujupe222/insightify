import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    } catch {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'ユーザーIDが見つかりません' });
    }
    const client = await pool.connect();
    try {
      // ユーザー情報取得
      const userResult = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const user = userResult.rows[0];
      // サブスクリプション情報取得
      const subsResult = await client.query('SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      const subscriptions = subsResult.rows;
      res.status(200).json({
        success: true,
        data: {
          user: {
            subscriptionStatus: user.subscription_status,
            subscriptionPlan: user.subscription_plan,
            monthlyPageViews: user.monthly_page_views,
            pageViewsLimit: user.page_views_limit,
            subscriptionStartDate: user.subscription_start_date,
            subscriptionEndDate: user.subscription_end_date
          },
          subscriptions
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Get user subscription error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
} 
