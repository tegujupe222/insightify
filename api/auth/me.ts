import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Return user information
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: decoded.sub || decoded.id,
          email: decoded.email,
          name: decoded.name || '',
          role: decoded.role || 'user',
          subscriptionStatus: decoded.subscriptionStatus || 'free',
          monthlyPageViews: decoded.monthlyPageViews || 0,
          pageViewsLimit: decoded.pageViewsLimit || 3000
        }
      }
    });
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
} 