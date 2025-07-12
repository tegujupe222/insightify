import { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';

// Google OAuth Strategy 設定
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
}, async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email found'), false);
    
    // 簡易的なユーザー作成（実際のプロジェクトではデータベースを使用）
    const user = {
      id: profile.id,
      email: email,
      role: 'user'
    };
    
    return done(null, user);
  } catch (err) {
    return done(err as Error, false);
  }
}));

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 