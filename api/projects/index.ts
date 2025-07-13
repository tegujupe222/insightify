import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // JWTトークンを検証
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '認証が必要です' });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
  
  const client = await pool.connect();
  
  try {
    if (req.method === 'GET') {
      // プロジェクト一覧取得（自分のプロジェクト + 共有されているプロジェクト）
      const projectsResult = await client.query(
        `SELECT DISTINCT p.*, 
                CASE 
                  WHEN p.user_id = $1 THEN 'owner'
                  ELSE pm.role
                END as user_role,
                pm.joined_at
         FROM projects p
         LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $1
         WHERE p.user_id = $1 OR pm.user_id = $1
         ORDER BY p.created_at DESC`,
        [decoded.userId]
      );

      const projects = projectsResult.rows.map(project => ({
        id: project.id,
        name: project.name,
        url: project.url,
        domains: project.domains || [],
        userId: project.user_id,
        trackingCode: project.tracking_code,
        isActive: project.is_active,
        userRole: project.user_role,
        joinedAt: project.joined_at,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      }));

      res.status(200).json({
        success: true,
        data: {
          data: projects,
          pagination: {
            page: 1,
            limit: 10,
            total: projects.length,
            totalPages: 1
          }
        }
      });
    } else if (req.method === 'POST') {
      // プロジェクト作成
      const { name, url, domains = [] } = req.body;

      if (!name || !url) {
        return res.status(400).json({
          success: false,
          error: 'プロジェクト名とURLは必須です'
        });
      }

      // URLの形式チェック
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          success: false,
          error: '有効なURLを入力してください'
        });
      }

      // プロジェクトを作成
      const projectResult = await client.query(
        `INSERT INTO projects (name, url, domains, user_id, tracking_code, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          name,
          url,
          JSON.stringify(domains),
          decoded.userId,
          `<!-- Insightify Tracking Snippet for ${name} -->
<script async defer src="https://cdn.insightify.com/tracker.js" data-project-id="${name.toLowerCase().replace(/\s+/g, '-')}"></script>`,
          true
        ]
      );

      const newProject = projectResult.rows[0];

      res.status(201).json({
        success: true,
        data: { 
          project: {
            id: newProject.id,
            name: newProject.name,
            url: newProject.url,
            domains: newProject.domains || [],
            userId: newProject.user_id,
            trackingCode: newProject.tracking_code,
            isActive: newProject.is_active,
            userRole: 'owner',
            createdAt: newProject.created_at,
            updatedAt: newProject.updated_at
          }
        },
        message: 'プロジェクトが正常に作成されました'
      });
    } else {
      res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Projects API error:', error);
    res.status(500).json({
      success: false,
      error: '内部サーバーエラーが発生しました'
    });
  } finally {
    client.release();
  }
} 