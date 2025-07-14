import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, subject, content } = req.body;

    if (!email || !subject || !content) {
      return res.status(400).json({ error: 'Email, subject, and content are required' });
    }

    // TODO: Implement actual email sending logic
    // For now, return mock success
    const mockResult = {
      sent: true,
      messageId: 'test-message-id-123'
    };

    res.status(200).json({
      success: true,
      data: mockResult
    });
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 