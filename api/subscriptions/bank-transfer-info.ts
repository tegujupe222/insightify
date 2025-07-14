import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // TODO: Implement actual bank transfer info retrieval
    // For now, return mock data
    const mockBankInfo = {
      bankName: 'サンプル銀行',
      accountNumber: '1234567',
      accountName: 'IGA factory',
      branchCode: '001',
      swiftCode: 'SMPLJPJT',
      routingNumber: '123456789'
    };

    res.status(200).json({
      success: true,
      data: {
        bankInfo: mockBankInfo
      }
    });
  } catch (error) {
    console.error('Bank transfer info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 