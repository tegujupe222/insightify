import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { email, password } = req.body;

      // 簡易的な認証（実際のプロジェクトではデータベースを使用）
      if (email && password) {
        const user = {
          id: 'demo-user-1',
          email: email,
          role: 'user',
          subscriptionStatus: 'free',
          monthlyPageViews: 0,
          pageViewsLimit: 3000
        };

        const token = jwt.sign(
          { 
            userId: user.id, 
            email: user.email, 
            role: user.role,
            subscriptionStatus: user.subscriptionStatus,
            monthlyPageViews: user.monthlyPageViews,
            pageViewsLimit: user.pageViewsLimit
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
              subscriptionStatus: user.subscriptionStatus,
              monthlyPageViews: user.monthlyPageViews,
              pageViewsLimit: user.pageViewsLimit
            },
            token: token
          },
          message: 'Login successful'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 