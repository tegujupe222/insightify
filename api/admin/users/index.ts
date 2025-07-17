import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface AuthUser {
  id: string;
  email: string;
  role: string;
}


// 認証ミドルウェア
const authenticateToken = (req: VercelRequest): AuthUser | null => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 認証チェック
  const user = authenticateToken(req);
  if (!user) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  // 管理者権限チェック
  if (user.role !== 'admin') {
    return res.status(403).json({ success: false, error: '管理者権限が必要です' });
  }

  const client = await pool.connect();
  
  try {
    if (req.method === 'GET') {
      // ページネーションパラメータを取得
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;

      // ユーザー一覧を取得（パフォーマンス改善のためLIMITとOFFSETを使用）
      const usersResult = await client.query(
        `SELECT 
          u.id,
          u.email,
          u.role,
          u.subscription_status,
          u.created_at,
          u.updated_at,
          COUNT(p.id) as project_count
         FROM users u
         LEFT JOIN projects p ON u.id = p.user_id
         GROUP BY u.id, u.email, u.role, u.subscription_status, u.created_at, u.updated_at
         ORDER BY u.created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      // 総ユーザー数を取得
      const countResult = await client.query('SELECT COUNT(*) as total FROM users');
      const total = parseInt(countResult.rows[0].total);

      const users = usersResult.rows.map(row => ({
        id: row.id,
        name: row.email.split('@')[0], // メールアドレスから名前を生成
        email: row.email,
        lastLogin: 'Recently', // 実際の実装ではlast_loginカラムから取得
        projectCount: parseInt(row.project_count),
        status: row.subscription_status === 'free' ? 'Active' : 'Active',
        role: row.role
      }));

      return res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        }
      });
    } else if (req.method === 'POST') {
      // 新規ユーザー作成
      const { name, email, role = 'user' } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: '名前とメールアドレスは必須です'
        });
      }

      // ユーザーを作成
      const newUserResult = await client.query(
        `INSERT INTO users (email, password, role, subscription_status, monthly_page_views, page_views_limit)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [email, 'temp_password', role, 'free', 0, 3000]
      );

      const newUser = newUserResult.rows[0];

      return res.status(201).json({
        success: true,
        data: { 
          user: {
            id: newUser.id,
            name,
            email: newUser.email,
            lastLogin: 'Never',
            projectCount: 0,
            status: 'Active',
            role: newUser.role
          }
        },
        message: 'ユーザーが正常に作成されました'
      });
    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({
      success: false,
      error: '内部サーバーエラーが発生しました'
    });
  } finally {
    client.release();
  }
} 
