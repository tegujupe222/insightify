// Vercel API Route for user authentication - me.ts
// This endpoint retrieves current user information from database
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Access token required'
        });
      }

      jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', async (err: any, decoded: any) => {
        if (err) {
          return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }

        const client = await pool.connect();
        
        try {
          // データベースから最新のユーザー情報を取得
          const userResult = await client.query(
            'SELECT * FROM users WHERE id = $1',
            [decoded.userId]
          );

          if (userResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              error: 'User not found'
            });
          }

          const user = userResult.rows[0];

          res.status(200).json({
            success: true,
            data: {
              user: {
                id: user.id,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status,
                monthlyPageViews: user.monthly_page_views,
                pageViewsLimit: user.page_views_limit
              }
            },
            message: 'User information retrieved successfully'
          });
        } finally {
          client.release();
        }
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 