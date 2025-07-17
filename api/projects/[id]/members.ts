import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id: projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ success: false, error: 'Project ID is required' });
  }

  // JWTトークンを検証
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
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

      // プロジェクトの存在確認と権限チェック
      const projectResult = await client.query(
        'SELECT id, name, user_id FROM projects WHERE id = $1',
        [projectId]
      );

      if (projectResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Project not found' });
      }

      const project = projectResult.rows[0];
      
      // プロジェクトの所有者または編集者でない場合はアクセスできない
      const memberResult = await client.query(
        `SELECT role FROM project_members 
         WHERE project_id = $1 AND user_id = $2 AND role IN ('owner', 'editor')`,
        [projectId, decoded.userId]
      );

      if (project.user_id !== decoded.userId && memberResult.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to access this project' 
        });
      }

      // 以降は元のロジックをそのまま使う
      switch (req.method) {
        case 'GET':
          // プロジェクトメンバー一覧を取得
          const membersResult = await client.query(
            `SELECT pm.*, u.email, u.role as user_role, u.created_at as user_created_at,
                    inviter.email as invited_by_email
             FROM project_members pm
             JOIN users u ON pm.user_id = u.id
             LEFT JOIN users inviter ON pm.invited_by = inviter.id
             WHERE pm.project_id = $1
             ORDER BY pm.created_at ASC`,
            [projectId]
          );

          // プロジェクト所有者も含める
          const ownerResult = await client.query(
            'SELECT id, email, role, created_at FROM users WHERE id = $1',
            [project.user_id]
          );

          const allMembers = [
            {
              id: ownerResult.rows[0].id,
              email: ownerResult.rows[0].email,
              role: 'owner',
              userRole: ownerResult.rows[0].role,
              joinedAt: project.created_at,
              invitedBy: null,
              invitedByEmail: null,
              isOwner: true
            },
            ...membersResult.rows.map(member => ({
              id: member.user_id,
              email: member.email,
              role: member.role,
              userRole: member.user_role,
              joinedAt: member.joined_at,
              invitedBy: member.invited_by,
              invitedByEmail: member.invited_by_email,
              isOwner: false
            }))
          ];

          res.status(200).json({
            success: true,
            data: {
              project: {
                id: project.id,
                name: project.name
              },
              members: allMembers
            }
          });
          break;

        case 'DELETE':
          // メンバーを削除
          const { memberId } = req.body;
          
          if (!memberId) {
            return res.status(400).json({ success: false, error: 'Member ID is required' });
          }

          // 自分自身を削除することはできない
          if (memberId === decoded.userId) {
            return res.status(400).json({ 
              success: false, 
              error: 'You cannot remove yourself from the project' 
            });
          }

          // プロジェクト所有者は削除できない
          if (memberId === project.user_id) {
            return res.status(400).json({ 
              success: false, 
              error: 'Cannot remove project owner' 
            });
          }

          // 削除対象のメンバーを確認
          const targetMemberResult = await client.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, memberId]
          );

          if (targetMemberResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Member not found' });
          }

          const targetMember = targetMemberResult.rows[0];

          // オーナーまたは編集者のみがメンバーを削除できる
          const currentUserRole = project.user_id === decoded.userId ? 'owner' : 
            memberResult.rows[0]?.role;

          if (currentUserRole !== 'owner' && targetMember.role === 'owner') {
            return res.status(403).json({ 
              success: false, 
              error: 'Only project owner can remove other owners' 
            });
          }

          // メンバーを削除
          await client.query(
            'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, memberId]
          );

          res.status(200).json({
            success: true,
            message: 'Member removed successfully'
          });
          break;

        case 'PATCH':
          // メンバーの権限を更新
          const { memberId: updateMemberId, role: newRole } = req.body;
          
          if (!updateMemberId || !newRole) {
            return res.status(400).json({ 
              success: false, 
              error: 'Member ID and role are required' 
            });
          }

          if (!['owner', 'editor', 'viewer'].includes(newRole)) {
            return res.status(400).json({ 
              success: false, 
              error: 'Invalid role. Must be "owner", "editor", or "viewer"' 
            });
          }

          // プロジェクト所有者のみが権限を変更できる
          if (project.user_id !== decoded.userId) {
            return res.status(403).json({ 
              success: false, 
              error: 'Only project owner can change member roles' 
            });
          }

          // 自分自身の権限を変更することはできない
          if (updateMemberId === decoded.userId) {
            return res.status(400).json({ 
              success: false, 
              error: 'You cannot change your own role' 
            });
          }

          // 更新対象のメンバーを確認
          const updateTargetMemberResult = await client.query(
            'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
            [projectId, updateMemberId]
          );

          if (updateTargetMemberResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Member not found' });
          }

          // メンバーの権限を更新
          await client.query(
            'UPDATE project_members SET role = $1 WHERE project_id = $2 AND user_id = $3',
            [newRole, projectId, updateMemberId]
          );

          res.status(200).json({
            success: true,
            message: 'Member role updated successfully'
          });
          break;

        default:
          res.status(405).json({ success: false, error: 'Method not allowed' });
      }

    } catch (error) {
      console.error('Project members API error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    } finally {
      client.release();
    }
  });
} 