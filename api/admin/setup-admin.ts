import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

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

      res.status(200).json({
        success: true,
        message: 'Admin users setup completed',
        data: {
          adminUsers: adminUsers.rows
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