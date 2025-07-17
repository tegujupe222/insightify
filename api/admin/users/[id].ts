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
const authenticateToken = (req: Request): AuthUser | null => {
  // Vercel環境とNode.js環境の両方に対応
  const authHeader = (req.headers as any).get ? 
    (req.headers as any).get('authorization') : 
    (req.headers as any)['authorization'];
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

export default async function handler(req: Request): Promise<Response> {
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 認証チェック
  const user = authenticateToken(req);
  if (!user) {
    return new Response(
      JSON.stringify({ success: false, error: '認証が必要です' }),
      { status: 401, headers }
    );
  }

  // 管理者権限チェック
  if (user.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: '管理者権限が必要です' }),
      { status: 403, headers }
    );
  }

  // URLからユーザーIDを取得（安全な方法）
  let userId: string | null = null;
  
  try {
    // まずURLをクリーンアップ
    const cleanUrl = req.url.split('?')[0]; // クエリパラメータを除去
    const url = new URL(cleanUrl, 'http://localhost'); // ベースURLを追加
    userId = url.pathname.split('/').pop() || null;
  } catch (error) {
    // URLが無効な場合は、パスから直接ユーザーIDを抽出
    const pathParts = req.url.split('/');
    userId = pathParts[pathParts.length - 1]?.split('?')[0] || null;
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'ユーザーIDが必要です' }),
      { status: 400, headers }
    );
  }

  const client = await pool.connect();
  
  try {
    if (req.method === 'DELETE') {
      // 自分自身を削除しようとしている場合のチェック
      if (user.id === userId) {
        return new Response(
          JSON.stringify({ success: false, error: '自分自身を削除することはできません' }),
          { status: 400, headers }
        );
      }

      // ユーザーが存在するかチェック
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'ユーザーが見つかりません' }),
          { status: 404, headers }
        );
      }

      // ユーザーを削除（関連データも削除）
      await client.query('DELETE FROM users WHERE id = $1', [userId]);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'ユーザーが正常に削除されました'
        }),
        { status: 200, headers }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers }
      );
    }
  } catch (error) {
    console.error('Admin user delete API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '内部サーバーエラーが発生しました'
      }),
      { status: 500, headers }
    );
  } finally {
    client.release();
  }
} 
