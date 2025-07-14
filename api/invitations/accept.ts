import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invitation token is required' 
      });
    }

    // JWTトークンを検証（ログイン済みユーザーのみ招待を承認可能）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const jwtToken = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    const client = await pool.connect();
    
    try {
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
        [decoded.userId || decoded.id]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = userResult.rows[0];
      if (user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
        return res.status(403).json({ 
          success: false, 
          error: 'You can only accept invitations sent to your email address' 
        });
      }

      // 既にメンバーかチェック
      const existingMember = await client.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [invitation.project_id, user.id]
      );

      if (existingMember.rows.length > 0) {
        // 既にメンバーの場合は招待を承認済みに更新
        await client.query(
          'UPDATE project_invitations SET status = $1 WHERE id = $2',
          ['accepted', invitation.id]
        );
        return res.status(400).json({ 
          success: false, 
          error: 'You are already a member of this project' 
        });
      }

      // プロジェクトメンバーとして追加
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role, invited_by)
         VALUES ($1, $2, $3, $4)`,
        [invitation.project_id, user.id, invitation.role, invitation.inviter_id]
      );

      // 招待のステータスを承認済みに更新
      await client.query(
        'UPDATE project_invitations SET status = $1 WHERE id = $2',
        ['accepted', invitation.id]
      );

      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
        data: {
          project: {
            id: invitation.project_id,
            name: invitation.project_name,
            url: invitation.project_url
          },
          role: invitation.role,
          inviterEmail: invitation.inviter_email
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to accept invitation'
    });
  }
} 