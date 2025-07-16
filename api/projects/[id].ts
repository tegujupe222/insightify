import jwt from 'jsonwebtoken';

interface Project {
  id: string;
  name: string;
  url: string;
  domains?: string[];
  userId: string;
  trackingCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

// 簡易的なインメモリストレージ（本番ではデータベースを使用）
// 注意: この配列はapi/projects/index.tsと同じものを参照する必要があります
// 実際の実装では、データベースや共有ストレージを使用してください
let projects: Project[] = [];

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
    const url = new URL(req.url);
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

  try {
    if (req.method === 'GET') {
      // プロジェクト詳細取得
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      // アクセス権限チェック
      if (user.role !== 'admin' && project.userId !== user.id) {
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
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      // アクセス権限チェック
      if (user.role !== 'admin' && project.userId !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      const body = await req.json();
      const { name, url, isActive } = body;

      if (name !== undefined) project.name = name;
      if (url !== undefined) {
        try {
          new URL(url);
          project.url = url;
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
      if (isActive !== undefined) project.isActive = isActive;
      project.updatedAt = new Date();

      return new Response(
        JSON.stringify({
          success: true,
          data: { project },
          message: 'プロジェクトが正常に更新されました'
        }),
        { status: 200, headers }
      );
    } else if (req.method === 'DELETE') {
      // プロジェクト削除
      const projectIndex = projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }

      const project = projects[projectIndex];

      // アクセス権限チェック
      if (user.role !== 'admin' && project.userId !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      // プロジェクトを削除
      projects.splice(projectIndex, 1);

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
  }
} 