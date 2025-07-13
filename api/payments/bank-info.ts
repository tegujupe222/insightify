import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const bankInfo = {
      bankName: process.env.BANK_NAME || '神戸信用金庫',
      branch: process.env.BANK_BRANCH || '本店',
      accountType: process.env.BANK_ACCOUNT_TYPE || '普通',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0726786',
      accountHolder: process.env.BANK_ACCOUNT_HOLDER || 'ｲｶﾞｻｷ ｺﾞｳﾀ'
    };

    res.status(200).json({
      success: true,
      data: bankInfo
    });
  } catch (error) {
    console.error('Bank info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bank information'
    });
  }
} 