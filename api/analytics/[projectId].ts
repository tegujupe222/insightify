import jwt from 'jsonwebtoken';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface DailyStat {
  date: string;
  visits: number;
}

interface Source {
  name: string;
  visitors: number;
  change: string;
}

interface DeviceData {
  name: string;
  value: number;
}

interface Kpi {
  value: string;
  change: string;
}

interface Kpis {
  pageViews: Kpi;
  uniqueUsers: Kpi;
  bounceRate: Kpi;
}

interface AnalyticsData {
  kpis: Kpis;
  visitorData: DailyStat[];
  sources: Source[];
  deviceData: DeviceData[];
  liveVisitors: number;
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

// ダミーデータ生成関数（実際の実装ではデータベースから取得）
const generateAnalyticsData = (): AnalyticsData => {
  // 過去30日間のビジターデータを生成
  const visitorData: DailyStat[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    visitorData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: Math.floor(Math.random() * (5000 - 1500 + 1)) + 1500,
    });
  }

  return {
    kpis: {
      pageViews: { value: '142,730', change: '+12.5%' },
      uniqueUsers: { value: '89,921', change: '+8.1%' },
      bounceRate: { value: '41.8%', change: '-2.3%' },
    },
    liveVisitors: Math.floor(Math.random() * 200) + 50,
    visitorData,
    sources: [
      { name: 'Google', visitors: 35420, change: '+22%' },
      { name: 'Direct', visitors: 21043, change: '+5%' },
      { name: 'X (Twitter)', visitors: 15888, change: '-8%' },
      { name: 'Facebook', visitors: 9123, change: '+15%' },
      { name: 'GitHub', visitors: 6543, change: '+3%' },
    ],
    deviceData: [
      { name: 'Desktop', value: 45 },
      { name: 'Mobile', value: 40 },
      { name: 'Tablet', value: 15 },
    ],
  };
};

export default async function handler(req: Request): Promise<Response> {
  // CORS設定
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
      // アナリティクスデータ取得
      // 実際の実装では、データベースからプロジェクトIDに基づいてデータを取得
      const analyticsData = generateAnalyticsData();

      return new Response(
        JSON.stringify({
          success: true,
          data: analyticsData
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
    console.error('Analytics API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '内部サーバーエラーが発生しました'
      }),
      { status: 500, headers }
    );
  }
} 