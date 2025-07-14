import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      const client = await pool.connect();
      
      try {
        // ユーザーを検索
        const userResult = await client.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        );

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }

        const user = userResult.rows[0];

        // パスワードを検証
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            error: 'Invalid credentials'
          });
        }

        // JWTトークンを生成
        const token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            role: user.role,
            subscriptionStatus: user.subscription_status,
            monthlyPageViews: user.monthly_page_views,
            pageViewsLimit: user.page_views_limit
          },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '7d' }
        );

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
            },
            token: token
          },
          message: 'Login successful'
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 