// Vercel API Route for user authentication - user-info.ts
// This endpoint retrieves current user information from database
// Updated for Vercel cache clearing
import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

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

      jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err: any, decoded: any) => {
        if (err) {
          return res.status(403).json({
            success: false,
            error: 'Invalid or expired token'
          });
        }

        // デコードされたトークンからユーザー情報を返す（データベース接続なし）
        const user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role,
          subscriptionStatus: decoded.subscriptionStatus || 'free',
          monthlyPageViews: decoded.monthlyPageViews || 0,
          pageViewsLimit: decoded.pageViewsLimit || 3000
        };

        res.status(200).json({
          success: true,
          data: {
            user: user
          },
          message: 'User information retrieved successfully'
        });
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