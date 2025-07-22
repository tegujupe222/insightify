import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { UserModel } from '../models/User';
import jwt from 'jsonwebtoken';
import { Secret } from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

const router = Router();

// Google OAuth Strategy 設定
passport.serializeUser((user: any, done) => {
  done(null, user);
});
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
}, async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email found'), false);
    let user = await UserModel.findByEmail(email);
    if (!user) {
      user = await UserModel.create({ email, password: '', role: 'user' });
    }
    return done(null, user);
  } catch (err) {
    return done(err as Error, false);
  }
}));

// Google認証開始
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google認証コールバック
router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
  const user = req.user as any;
  const secret: Secret = process.env.JWT_SECRET!;
  const signOptions: SignOptions = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, secret, signOptions);
  // JWTをクエリパラメータでフロントに返す
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
});

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.me);

export default router; 