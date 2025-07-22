import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    success: true,
    message: 'Test API is working',
    timestamp: new Date().toISOString()
  });
} 
