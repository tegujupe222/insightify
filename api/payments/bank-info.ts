import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // 本番銀行振込情報（api/subscriptions/bank-transfer-info.tsと同じ内容）
    const bankInfo = {
      bankName: '神戸信用金庫',
      branchName: '本店',
      accountType: '普通',
      accountNumber: '0726786',
      accountHolder: 'ｲｶﾞｻｷ ｺﾞｳﾀ',
      accountHolderKana: 'イガサキ ゴウタ',
      contactEmail: 'igafactory2023@gmail.com'
    };

    res.status(200).json({
      success: true,
      data: { bankInfo },
      message: 'Bank transfer info fetched successfully'
    });
  } catch (error) {
    console.error('Bank info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bank information'
    });
  }
} 
