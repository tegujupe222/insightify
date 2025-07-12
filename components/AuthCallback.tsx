import React, { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser } from '../types';

interface AuthCallbackProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onLoginSuccess }) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const user: AuthUser = {
          id: decoded.sub || '',
          email: decoded.email,
          role: decoded.role || 'user',
          name: decoded.name || '',
          token: token,
          subscriptionStatus: decoded.subscriptionStatus || 'free',
          monthlyPageViews: decoded.monthlyPageViews || 0,
          pageViewsLimit: decoded.pageViewsLimit || 3000
        };
        // トークンをlocalStorage等に保存（必要なら）
        localStorage.setItem('jwt', token);
        onLoginSuccess(user);
        // トップページにリダイレクト（App.tsxのロジックで自動遷移）
      } catch (e) {
        // エラー時はログイン画面に戻す
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, [onLoginSuccess]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="text-lg">Logging you in...</div>
    </div>
  );
}; 