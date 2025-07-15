import jwt from 'jsonwebtoken';

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const decoded = jwt.verify(token, secret) as any;
    
    // Check if user ID exists in token
    if (!decoded.userId && !decoded.id) {
      return res.status(401).json({ error: 'User ID is missing from JWT token' });
    }

    const userId = decoded.userId || decoded.id;

    // Return user info (in a real app, you'd fetch from database)
    return res.status(200).json({
      id: userId,
      email: decoded.email,
      role: decoded.role || 'user',
      name: decoded.name || 'User'
    });

  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
} 