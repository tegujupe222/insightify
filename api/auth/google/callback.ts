import { VercelRequest, VercelResponse } from '@vercel/node';
import passport from 'passport';
import jwt from 'jsonwebtoken';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    passport.authenticate('google', { failureRedirect: '/' }, (err: any, user: any) => {
      if (err || !user) {
        console.error('OAuth error:', err, user);
        return res.redirect('/?error=auth_failed');
      }

      try {
        const token = jwt.sign(
          { userId: user.id, email: user.email, role: user.role },
          process.env.JWT_SECRET || 'fallback-secret',
          { expiresIn: '7d' }
        );

        const frontendUrl = process.env.FRONTEND_URL || 'https://insightify-eight.vercel.app';
        res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      } catch (error) {
        console.error('JWT error:', error);
        res.redirect('/?error=token_error');
      }
    })(req, res); // nextは渡さない
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 