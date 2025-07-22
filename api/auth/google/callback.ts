import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { v4 as uuidv4 } from 'uuid';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL // ここは https://.../api/auth/google/callback
  );

  try {
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const client = await pool.connect();
    try {
      // 既存ユーザーを確認
      const existingUser = await client.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [data.email]
      );

      let userId: string;

      if (existingUser.rows.length > 0) {
        // 既存ユーザーの場合は既存のUUIDを使用
        userId = existingUser.rows[0].id;
        console.log(`Existing user found: ${data.email} with ID: ${userId}`);
      } else {
        // 新規ユーザーの場合は新しいUUIDを生成
        userId = uuidv4();
        
        // ユーザーをデータベースに保存
        await client.query(
          `INSERT INTO users (id, email, password, role, subscription_status, monthly_page_views, page_views_limit)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [userId, data.email, 'google_oauth', 'user', 'free', 0, 3000]
        );
        console.log(`New user created: ${data.email} with ID: ${userId}`);
      }

      // JWTペイロードを統一（userIdフィールドを使用）
      const jwtPayload = {
        userId: userId, // UUIDを使用
        email: data.email,
        name: data.name,
        role: existingUser.rows.length > 0 ? existingUser.rows[0].role : 'user'
      };

      const token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

      const frontendUrl = process.env.FRONTEND_URL || 'https://insightify-eight.vercel.app';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
} 