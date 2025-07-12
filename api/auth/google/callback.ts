import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';

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

    // 必要なユーザー情報を抽出
    const user = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: 'user'
    };

    const token = jwt.sign(user, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '7d' });

    const frontendUrl = process.env.FRONTEND_URL || 'https://insightify-eight.vercel.app';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
} 