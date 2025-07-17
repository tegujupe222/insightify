import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import * as sgMail from '@sendgrid/mail';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@insightify.com';
const FROM_NAME = process.env.FROM_NAME || 'Insightify Team';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { projectId, email, role = 'viewer', message } = req.body;
    
    if (!projectId || !email) {
      return res.status(400).json({ 
        success: false, 
        error: 'Project ID and email are required' 
      });
    }

    if (!['owner', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid role. Must be "owner", "editor", or "viewer"' 
      });
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
        // プロジェクトの存在確認と権限チェック
        const projectResult = await client.query(
          'SELECT id, name, user_id FROM projects WHERE id = $1',
          [projectId]
        );

        if (projectResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const project = projectResult.rows[0];
        
        // プロジェクトの所有者または編集者でない場合は招待できない
        const memberResult = await client.query(
          `SELECT role FROM project_members 
           WHERE project_id = $1 AND user_id = $2 AND role IN ('owner', 'editor')`,
          [projectId, decoded.userId]
        );

        if (project.user_id !== decoded.userId && memberResult.rows.length === 0) {
          return res.status(403).json({ 
            success: false, 
            error: 'You do not have permission to invite users to this project' 
          });
        }

        // 招待テーブルを作成（存在しない場合）
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

        // プロジェクトメンバーテーブルを作成（存在しない場合）
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

        // 既存の招待があるかチェック
        const existingInvitation = await client.query(
          'SELECT id, status FROM project_invitations WHERE project_id = $1 AND invitee_email = $2 AND status = $3',
          [projectId, email, 'pending']
        );

        if (existingInvitation.rows.length > 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'An invitation has already been sent to this email address' 
          });
        }

        // 既にメンバーかチェック
        const existingMember = await client.query(
          'SELECT id FROM project_members WHERE project_id = $1 AND user_id = (SELECT id FROM users WHERE email = $2)',
          [projectId, email]
        );

        if (existingMember.rows.length > 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'User is already a member of this project' 
          });
        }

        // 招待トークンを生成
        const invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7日間有効

        // 招待を作成
        const invitationResult = await client.query(
          `INSERT INTO project_invitations (project_id, inviter_id, invitee_email, role, message, token, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [projectId, decoded.userId, email, role, message, invitationToken, expiresAt]
        );

        const invitation = invitationResult.rows[0];

        // 招待メールを送信
        const inviteUrl = `${process.env.FRONTEND_URL || 'https://your-domain.vercel.app'}/invite/${invitationToken}`;
        
        const emailSubject = '【Insightify】プロジェクトへの招待';
        const emailContent = `
          ${email} 様

          ${project.name}プロジェクトに招待されました。

          【プロジェクト情報】
          プロジェクト名：${project.name}
          権限：${role === 'owner' ? 'オーナー' : role === 'editor' ? '編集者' : '閲覧者'}

          ${message ? `【メッセージ】\n${message}\n` : ''}

          【招待の承認方法】
          下記のリンクをクリックして招待を承認してください：
          ${inviteUrl}

          このリンクは7日間有効です。

          --
          Insightify Team
        `;

        let emailSent = false;
        if (SENDGRID_API_KEY) {
          try {
            const msg = {
              to: email,
              from: {
                email: FROM_EMAIL,
                name: FROM_NAME
              },
              subject: emailSubject,
              text: emailContent,
              html: `
                <!DOCTYPE html>
                <html lang="ja">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>プロジェクトへの招待</title>
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                    .content { padding: 40px 30px; }
                    .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
                    .footer { background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1>Insightify</h1>
                    </div>
                    <div class="content">
                      <h2>プロジェクトへの招待</h2>
                      <p>${email} 様</p>
                      <p><strong>${project.name}</strong>プロジェクトに招待されました。</p>
                      
                      <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
                        <h3>プロジェクト情報</h3>
                        <p><strong>プロジェクト名：</strong>${project.name}</p>
                        <p><strong>権限：</strong>${role === 'owner' ? 'オーナー' : role === 'editor' ? '編集者' : '閲覧者'}</p>
                      </div>

                      ${message ? `
                      <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin: 20px 0;">
                        <h3>メッセージ</h3>
                        <p>${message}</p>
                      </div>
                      ` : ''}

                      <a href="${inviteUrl}" class="button">招待を承認する</a>
                      
                      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                        このリンクは7日間有効です。
                      </p>
                    </div>
                    <div class="footer">
                      <p>Insightify Analytics Platform</p>
                      <p>このメールは自動送信されています</p>
                    </div>
                  </div>
                </body>
                </html>
              `
            };

            await sgMail.send(msg);
            emailSent = true;
            console.log(`✅ Invitation email sent to ${email}`);
          } catch (error) {
            console.error('Failed to send invitation email:', error);
          }
        }

        res.status(200).json({
          success: true,
          message: 'Invitation sent successfully',
          data: {
            invitation: {
              id: invitation.id,
              projectId: invitation.project_id,
              inviteeEmail: invitation.invitee_email,
              role: invitation.role,
              status: invitation.status,
              expiresAt: invitation.expires_at
            },
            emailSent
          }
        });

      } finally {
        client.release();
      }
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invitation'
    });
  }
} 