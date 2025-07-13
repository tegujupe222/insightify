import jwt from 'jsonwebtoken';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// 認証ミドルウェア
const authenticateToken = (req: Request): AuthUser | null => {
  const authHeader = req.headers.get('authorization');
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

  // URLからユーザーIDを取得
  const url = new URL(req.url);
  const userId = url.pathname.split('/').pop();

  if (!userId) {
    return new Response(
      JSON.stringify({ success: false, error: 'ユーザーIDが必要です' }),
      { status: 400, headers }
    );
  }

  try {
    if (req.method === 'DELETE') {
      // 自分自身を削除しようとしている場合のチェック
      if (user.id === userId) {
        return new Response(
          JSON.stringify({ success: false, error: '自分自身を削除することはできません' }),
          { status: 400, headers }
        );
      }

      // 実際の実装では、データベースからユーザーを削除
      // ここでは成功レスポンスを返す（ダミー実装）
      
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
  }
} 