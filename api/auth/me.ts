import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    // 必要なユーザー情報のみ返す
    res.status(200).json({
      success: true,
      data: {
        user: decoded
      }
    });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
} 