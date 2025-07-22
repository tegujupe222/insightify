import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    
    try {
      // 管理者メールアドレスのユーザーを確認
      const adminEmails = ['g-igasaki@shinko.ed.jp', 'igafactory2023@gmail.com'];
      
      const adminUsers = await client.query(
        'SELECT id, email, role, subscription_status FROM users WHERE email = ANY($1)',
        [adminEmails]
      );

      // 全管理者ユーザーを取得
      const allAdmins = await client.query(
        'SELECT id, email, role, subscription_status FROM users WHERE role = $1',
        ['admin']
      );

      res.status(200).json({
        success: true,
        data: {
          adminEmails,
          adminUsers: adminUsers.rows,
          allAdmins: allAdmins.rows
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check admin users'
    });
  }
} 