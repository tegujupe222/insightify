import jwt from 'jsonwebtoken';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  lastLogin: string;
  projectCount: number;
  status: 'Active' | 'Inactive';
  role?: 'admin' | 'user';
  isBanned?: boolean;
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

// ダミーユーザーデータ（実際の実装ではデータベースから取得）
const generateMockUsers = (): User[] => [
  { id: 'user-1', name: 'Satoshi Nakamoto', email: 'satoshi@gmx.com', lastLogin: '2 hours ago', projectCount: 3, status: 'Active' },
  { id: 'user-2', name: 'Vitalik Buterin', email: 'vitalik@ethereum.org', lastLogin: '1 day ago', projectCount: 1, status: 'Active' },
  { id: 'user-3', name: 'Charles Hoskinson', email: 'charles@cardano.io', lastLogin: '5 days ago', projectCount: 5, status: 'Inactive' },
  { id: 'user-4', name: 'Gavin Wood', email: 'gavin@polkadot.network', lastLogin: '2 weeks ago', projectCount: 2, status: 'Active' },
];

export default async function handler(req: Request): Promise<Response> {
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    if (req.method === 'GET') {
      // ユーザー一覧取得
      const users = generateMockUsers();

      return new Response(
        JSON.stringify({
          success: true,
          data: users
        }),
        { status: 200, headers }
      );
    } else if (req.method === 'POST') {
      // 新規ユーザー作成
      const body = await req.json();
      const { name, email, role = 'user' } = body;

      if (!name || !email) {
        return new Response(
          JSON.stringify({
            success: false,
            error: '名前とメールアドレスは必須です'
          }),
          { status: 400, headers }
        );
      }

      // 実際の実装では、データベースにユーザーを保存
      const newUser: User = {
        id: `user-${Date.now()}`,
        name,
        email,
        lastLogin: 'Never',
        projectCount: 0,
        status: 'Active',
        role: role as 'admin' | 'user'
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: { user: newUser },
          message: 'ユーザーが正常に作成されました'
        }),
        { status: 201, headers }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers }
      );
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '内部サーバーエラーが発生しました'
      }),
      { status: 500, headers }
    );
  }
} 