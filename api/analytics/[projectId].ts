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

// データベースからアナリティクスデータを取得する関数
const getAnalyticsData = async(projectId: string): Promise<AnalyticsData> => {
  const client = await pool.connect();
  try {
    // プロジェクトの存在と権限チェック
    const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectResult.rows.length === 0) {
      throw new Error('プロジェクトが見つかりません');
    }

    // 過去30日間のビジターデータを取得
    const visitorDataResult = await client.query(
      `SELECT DATE(timestamp) as date, COUNT(DISTINCT session_id) as visits
       FROM page_views
       WHERE project_id = $1 AND timestamp >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(timestamp)
       ORDER BY date`,
      [projectId]
    );

    const visitorData: DailyStat[] = visitorDataResult.rows.map(row => ({
      date: new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: parseInt(row.visits)
    }));

    // KPIデータを取得
    const kpiResult = await client.query(
      `SELECT 
         COUNT(*) as total_page_views,
         COUNT(DISTINCT session_id) as unique_users,
         COUNT(DISTINCT CASE WHEN timestamp > NOW() - INTERVAL '5 minutes' THEN session_id END) as live_visitors
       FROM page_views
       WHERE project_id = $1`,
      [projectId]
    );

    const kpiData = kpiResult.rows[0];
    const totalPageViews = parseInt(kpiData.total_page_views) || 0;
    const uniqueUsers = parseInt(kpiData.unique_users) || 0;
    const liveVisitors = parseInt(kpiData.live_visitors) || 0;

    // データが存在しない場合はテスト用ダミーデータを返す
    if (totalPageViews === 0) {
      console.log('No analytics data found, returning demo data');
      return {
        kpis: {
          pageViews: { value: '1,234', change: '+12%' },
          uniqueUsers: { value: '567', change: '+8%' },
          bounceRate: { value: '45%', change: '-3%' }
        },
        liveVisitors: 3,
        visitorData: [
          { date: 'Dec 15', visits: 45 },
          { date: 'Dec 16', visits: 52 },
          { date: 'Dec 17', visits: 48 },
          { date: 'Dec 18', visits: 61 },
          { date: 'Dec 19', visits: 55 },
          { date: 'Dec 20', visits: 67 },
          { date: 'Dec 21', visits: 73 }
        ],
        sources: [
          { name: 'Direct', visitors: 234, change: '+15%' },
          { name: 'Google', visitors: 189, change: '+8%' },
          { name: 'Facebook', visitors: 156, change: '+12%' },
          { name: 'Twitter', visitors: 98, change: '+5%' },
          { name: 'LinkedIn', visitors: 67, change: '+3%' }
        ],
        deviceData: [
          { name: 'Desktop', value: 65 },
          { name: 'Mobile', value: 28 },
          { name: 'Tablet', value: 7 }
        ]
      };
    }

    // ソース別データを取得
    const sourcesResult = await client.query(
      `SELECT referrer, COUNT(DISTINCT session_id) as visitors
       FROM page_views
       WHERE project_id = $1 AND referrer IS NOT NULL AND referrer != ''
       GROUP BY referrer
       ORDER BY visitors DESC
       LIMIT 5`,
      [projectId]
    );

    const sources: Source[] = sourcesResult.rows.map(row => ({
      name: row.referrer || 'Direct',
      visitors: parseInt(row.visitors),
      change: '+0%' // 実際の実装では前日比を計算
    }));

    // デバイス別データを取得
    const deviceResult = await client.query(
      `SELECT device_type, COUNT(DISTINCT session_id) as count
       FROM page_views
       WHERE project_id = $1
       GROUP BY device_type`,
      [projectId]
    );

    const totalSessions = deviceResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const deviceData: DeviceData[] = deviceResult.rows.map(row => ({
      name: row.device_type || 'Unknown',
      value: totalSessions > 0 ? Math.round((parseInt(row.count) / totalSessions) * 100) : 0
    }));

    return {
      kpis: {
        pageViews: { value: totalPageViews.toLocaleString(), change: '+0%' },
        uniqueUsers: { value: uniqueUsers.toLocaleString(), change: '+0%' },
        bounceRate: { value: '0%', change: '0%' } // 実際の実装では計算
      },
      liveVisitors,
      visitorData,
      sources,
      deviceData
    };
  } finally {
    client.release();
  }
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
      // プロジェクトの権限チェック
      const projectResult = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
      if (projectResult.rows.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'プロジェクトが見つかりません' }),
          { status: 404, headers }
        );
      }
      const project = projectResult.rows[0];
      if (user.role !== 'admin' && project.user_id !== user.id) {
        return new Response(
          JSON.stringify({ success: false, error: 'アクセスが拒否されました' }),
          { status: 403, headers }
        );
      }

      // アナリティクスデータ取得
      const analyticsData = await getAnalyticsData(projectId);

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
  } finally {
    client.release();
  }
} 
