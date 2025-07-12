import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Profile } from 'passport-google-oauth20';
import { VerifyCallback } from 'passport-oauth2';
import { UserModel } from '../models/User';

export const setupPassport = () => {
  // Google OAuth設定
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback'
  }, async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
      // ユーザーを検索または作成
      let user = await UserModel.findByEmail(profile.emails?.[0]?.value || '');
      
      if (!user) {
              // 新規ユーザー作成
      user = await UserModel.create({
        email: profile.emails?.[0]?.value || '',
        password: Math.random().toString(36).slice(-10), // ランダムパスワード
        role: 'user'
      });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));

  // セッションシリアライゼーション
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await UserModel.findById(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
}; 