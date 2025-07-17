import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import { verify } from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation token is required' 
      });
    }

    // JWTトークンを検証（ログイン済みユーザーのみ招待を確認可能）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const decoded = verify(jwtToken, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const client = await pool.connect();
    
    try {
      // project_invitationsテーブルが存在しない場合は作成
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_invitations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          invitee_email VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
          message TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

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

      // 招待を検索
      const invitationResult = await client.query(
        `SELECT i.*, p.name as project_name, p.url as project_url, u.email as inviter_email
         FROM project_invitations i
         JOIN projects p ON i.project_id = p.id
         JOIN users u ON i.inviter_id = u.id
         WHERE i.token = $1`,
        [token]
      );

      if (invitationResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // 招待のステータスをチェック
      if (invitation.status !== 'pending') {
        return res.status(400).json({ 
          success: false, 
          error: `Invitation has already been ${invitation.status}` 
        });
      }

      // 招待の有効期限をチェック
      if (new Date() > new Date(invitation.expires_at)) {
        // 招待を期限切れに更新
        await client.query(
          'UPDATE project_invitations SET status = $1 WHERE id = $2',
          ['expired', invitation.id]
        );
        return res.status(400).json({ 
          success: false, 
          error: 'Invitation has expired' 
        });
      }

      // 招待されたメールアドレスとログインユーザーのメールアドレスが一致するかチェック
      const userResult = await client.query(
        'SELECT id, email FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      if (user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only view invitations sent to your email address' 
        });
      }

      // 既にメンバーかチェック
      const existingMember = await client.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [invitation.project_id, user.id]
      );

      if (existingMember.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'You are already a member of this project' 
        });
      }

      res.status(200).json({
        success: true,
        data: {
          projectName: invitation.project_name,
          projectUrl: invitation.project_url,
          role: invitation.role,
          inviterEmail: invitation.inviter_email,
          expiresAt: invitation.expires_at
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Validate invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate invitation'
    });
  }
} 