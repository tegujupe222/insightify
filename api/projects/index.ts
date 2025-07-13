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
let projects: Project[] = [];

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    if (req.method === 'GET') {
      // プロジェクト一覧取得
      const userProjects = projects.filter(project => 
        user.role === 'admin' || project.userId === user.id
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            data: userProjects,
            pagination: {
              page: 1,
              limit: 10,
              total: userProjects.length,
              totalPages: 1
            }
          }
        }),
        { status: 200, headers }
      );
    } else if (req.method === 'POST') {
      // プロジェクト作成
      const body = await req.json();
      const { name, url } = body;

      if (!name || !url) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'プロジェクト名とURLは必須です'
          }),
          { status: 400, headers }
        );
      }

      // URLの形式チェック
      try {
        new URL(url);
      } catch {
        return new Response(
          JSON.stringify({
            success: false,
            error: '有効なURLを入力してください'
          }),
          { status: 400, headers }
        );
      }

      const newProject: Project = {
        id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        url,
        userId: user.id,
        trackingCode: `<!-- Insightify Tracking Snippet for ${name} -->
<script async defer src="https://cdn.insightify.com/tracker.js" data-project-id="${`project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`}"></script>`,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      projects.push(newProject);

      return new Response(
        JSON.stringify({
          success: true,
          data: { project: newProject },
          message: 'プロジェクトが正常に作成されました'
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
    console.error('Projects API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '内部サーバーエラーが発生しました'
      }),
      { status: 500, headers }
    );
  }
} 