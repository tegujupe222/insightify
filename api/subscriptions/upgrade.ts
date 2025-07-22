import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { planType } = req.body;
    
    if (!planType || !['monthly', 'yearly'].includes(planType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan type. Must be "monthly" or "yearly"' 
      });
    }

    // JWTトークンを検証
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const client = await pool.connect();
    
    try {
      // ユーザーを取得
      const userResult = await client.query(
        'SELECT id, email, subscription_status FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      const amount = planType === 'monthly' ? 5500 : 55000;
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // サブスクリプションテーブルを作成（存在しない場合）
      await client.query(`
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
          amount INTEGER NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'expired')),
          invoice_number VARCHAR(100) UNIQUE NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'bank_transfer',
          payment_confirmed_by UUID REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // サブスクリプションを作成
      const subscriptionResult = await client.query(
        `INSERT INTO subscriptions (user_id, plan_type, amount, invoice_number, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user.id, planType, amount, invoiceNumber, 'pending']
      );

      // ユーザーのサブスクリプション状況を更新
      await client.query(
        `UPDATE users 
         SET subscription_status = $1, subscription_plan = $2
         WHERE id = $3`,
        ['pending', planType, user.id]
      );

      // メール通知テーブルを作成（存在しない場合）
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          subject TEXT NOT NULL,
          content TEXT NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          error_message TEXT,
          sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // メール通知を作成
      const emailSubject = '【Insightify】サブスクリプション申し込みを受け付けました';
      const emailContent = `
        ${user.email} 様

        Insightifyプレミアムプランのお申し込みを受け付けました。

        【申し込み内容】
        プラン：${planType === 'monthly' ? '月額' : '年額'}
        金額：¥${amount.toLocaleString()}
        請求書番号：${invoiceNumber}

        【お支払い方法】
        銀行振込にてお支払いください。
        
        振込先口座情報：
        銀行名：神戸信用金庫
        支店名：本店
        口座種別：普通
        口座番号：0726786
        口座名義：ｲｶﾞｻｷ ｺﾞｳﾀ

        お支払い確認後、プレミアム機能が有効になります。

        --
        Insightify Team
      `;

      await client.query(
        `INSERT INTO email_notifications (user_id, type, subject, content, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, 'subscription_requested', emailSubject, emailContent, 'pending']
      );

      res.status(200).json({
        success: true,
        message: 'Subscription upgrade request created successfully',
        data: {
          subscription: subscriptionResult.rows[0],
          emailNotification: {
            subject: emailSubject,
            content: emailContent
          }
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription upgrade request'
    });
  }
} 