import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import * as jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

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
  
  // JWTからユーザーIDを取得（userIdまたはidのいずれかを使用）
  const userId = decoded.userId || decoded.id;

  // ユーザーIDの存在チェックのみ行う（UUIDバリデーションは削除）
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'ユーザーIDが見つかりません'
    });
  }

  const client = await pool.connect();
  
  try {
    // project_membersテーブルが存在しない場合は作成
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      )
    `);

    if (req.method === 'GET') {
      // プロジェクト一覧取得（自分のプロジェクトのみ）
      const projectsResult = await client.query(
        `SELECT p.*, 'owner' as user_role, p.created_at as joined_at
         FROM projects p
         WHERE p.user_id = $1
         ORDER BY p.created_at DESC`,
        [userId]
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

      // userIdがusersテーブルに存在するかチェック
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: '指定されたユーザーが存在しません（認証エラー）'
        });
      }

      // プロジェクトを作成（まずIDを生成）
      const projectId = randomUUID();
      const trackingCode = `<!-- Insightify Tracking Snippet for ${name} -->
<script async defer src="${process.env.NODE_ENV === 'production' ? 'https://insightify-eight.vercel.app' : 'http://localhost:3000'}/tracker/tracker.js" data-project-id="${projectId}"></script>`;

      const projectResult = await client.query(
        `INSERT INTO projects (id, name, url, domains, user_id, tracking_code, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          projectId,
          name,
          url,
          JSON.stringify(domains),
          userId,
          trackingCode,
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