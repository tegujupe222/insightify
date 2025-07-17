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
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
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

  // URLからプロジェクトIDを取得（安全な方法）
  let projectId: string | null = null;
  
  try {
    // まずURLをクリーンアップ
    const cleanUrl = req.url.split('?')[0]; // クエリパラメータを除去
    const url = new URL(cleanUrl, 'http://localhost'); // ベースURLを追加
    projectId = url.pathname.split('/').pop() || null;
  } catch (error) {
    // URLが無効な場合は、パスから直接プロジェクトIDを抽出
    const pathParts = req.url.split('/');
    projectId = pathParts[pathParts.length - 1]?.split('?')[0] || null;
  }

  if (!projectId) {
    return new Response(
      JSON.stringify({ success: false, error: 'プロジェクトIDが必要です' }),
      { status: 400, headers }
    );
  }

  const client = await pool.connect();
  
  try {
    if (req.method === 'GET') {
      // プロジェクト詳細取得
      const result = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      const project = result.rows[0];

      // アクセス権限チェック
      if (user.role !== 'admin' && project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: { project }
        }),
        { status: 200, headers }
      );
    } else if (req.method === 'PUT') {
      // プロジェクト更新
      const result = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      const project = result.rows[0];

      // アクセス権限チェック
      if (user.role !== 'admin' && project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      const body = await req.json();
      const { name, url, isActive } = body;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        updateValues.push(name);
      }
      if (url !== undefined) {
        try {
          new URL(url);
          updateFields.push(`url = $${paramCount++}`);
          updateValues.push(url);
        } catch {
          return new Response(
            JSON.stringify({
              success: false,
              error: '有効なURLを入力してください'
            }),
            { status: 400, headers }
          );
        }
      }
      if (isActive !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        updateValues.push(isActive);
      }

      if (updateFields.length > 0) {
        updateFields.push('updated_at = NOW()');
        updateValues.push(projectId);

        await client.query(
          `UPDATE projects SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          updateValues
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'プロジェクトが正常に更新されました'
        }),
        { status: 200, headers }
      );
    } else if (req.method === 'DELETE') {
      // プロジェクト削除
      const result = await client.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      const project = result.rows[0];

      // アクセス権限チェック
      if (user.role !== 'admin' && project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      // プロジェクトを削除（関連データも削除）
      await client.query('DELETE FROM projects WHERE id = $1', [projectId]);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'プロジェクトが正常に削除されました'
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
    console.error('Project API error:', error);
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
