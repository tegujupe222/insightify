import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const ADMIN_EMAILS = [
  'g-igasaki@shinko.ed.jp',
  'igafactory2023@gmail.com'
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    try {
      // 管理者メールアドレスのユーザーを確認・作成・更新
      for (const email of ADMIN_EMAILS) {
        const existingUser = await client.query(
          'SELECT id, email, role FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          // 既存ユーザーがいる場合、管理者権限に更新
          const user = existingUser.rows[0];
          if (user.role !== 'admin') {
            await client.query(
              'UPDATE users SET role = $1, subscription_status = $2, page_views_limit = $3 WHERE id = $4',
              ['admin', 'premium', 100000, user.id]
            );
            console.log(`Updated user ${email} to admin role`);
          }
        } else {
          // 新規ユーザーを作成
          const hashedPassword = await bcrypt.hash('admin123', 12);
          await client.query(
            `INSERT INTO users (email, password, role, subscription_status, page_views_limit, monthly_page_views)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [email, hashedPassword, 'admin', 'premium', 100000, 0]
          );
          console.log(`Created new admin user: ${email}`);
        }
      }

      // 管理者ユーザー一覧を取得
      const adminUsers = await client.query(
        'SELECT id, email, role, subscription_status FROM users WHERE role = $1',
        ['admin']
      );

      // リクエストユーザーのメールアドレスをJWTから取得
      const authHeader = req.headers.authorization;
      let token = null;
      let newToken = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
          // DBから最新のユーザー情報を取得
          const userResult = await client.query('SELECT id, email, role, subscription_status FROM users WHERE email = $1', [decoded.email]);
          if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            newToken = jwt.sign(
              {
                id: user.id,
                email: user.email,
                role: user.role,
                subscriptionStatus: user.subscription_status || 'free',
                monthlyPageViews: user.monthly_page_views || 0,
                pageViewsLimit: user.page_views_limit || 3000
              },
              process.env.JWT_SECRET || 'fallback-secret',
              { expiresIn: '7d' }
            );
          }
        } catch (e) {
          // ignore
        }
      }

      res.status(200).json({
        success: true,
        message: 'Admin users setup completed',
        data: {
          adminUsers: adminUsers.rows,
          token: newToken // 新しいトークンを返す
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to setup admin users'
    });
  }
} 