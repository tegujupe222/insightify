import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { email, planType } = req.body;
    
    if (!email || !planType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and planType are required' 
      });
    }

    const client = await pool.connect();
    
    try {
      // ユーザーを検索または作成
      let user = await client.query(
        'SELECT id, email, role, subscription_status FROM users WHERE email = $1',
        [email]
      );

      if (user.rows.length === 0) {
        // テスト用ユーザーを作成
        const result = await client.query(
          `INSERT INTO users (email, password, role, subscription_status, page_views_limit, monthly_page_views)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, email, role, subscription_status`,
          [email, 'test123', 'user', 'free', 3000, 0]
        );
        user = result;
      }

      const userId = user.rows[0].id;
      const amount = planType === 'monthly' ? 5500 : 55000;
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // サブスクリプションを作成
      const subscription = await client.query(
        `INSERT INTO subscriptions (user_id, plan_type, amount, invoice_number, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, planType, amount, invoiceNumber, 'pending']
      );

      // ユーザーのサブスクリプション状況を更新
      await client.query(
        `UPDATE users 
         SET subscription_status = $1, subscription_plan = $2
         WHERE id = $3`,
        ['pending', planType, userId]
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
        ${email} 様

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
        [userId, 'subscription_requested', emailSubject, emailContent, 'pending']
      );

      res.status(200).json({
        success: true,
        message: 'Test subscription created successfully',
        data: {
          user: user.rows[0],
          subscription: subscription.rows[0],
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
    console.error('Test subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test subscription'
    });
  }
} 