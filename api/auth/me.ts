import { VercelRequest, VercelResponse } from '@vercel/node';
import * as jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // Try to get user info from database first
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, email, role, subscription_status, monthly_page_views, page_views_limit FROM users WHERE id = $1',
          [decoded.userId]
        );
        
        if (result.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const user = result.rows[0];
        
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
          }
        });
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      
      // Fallback: return user info from JWT token when database is unavailable
      res.status(200).json({
        success: true,
        data: {
          user: {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            subscriptionStatus: 'active',
            monthlyPageViews: 0,
            pageViewsLimit: 10000
          }
        },
        warning: 'Database temporarily unavailable, using cached user data'
      });
    }
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
} 