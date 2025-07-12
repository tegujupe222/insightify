import React, { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { AuthUser } from '../types';
import { useNavigate } from 'react-router-dom';

interface AuthCallbackProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();

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
        localStorage.setItem('jwt', token);
        onLoginSuccess(user);
        // 明示的にトップページへリダイレクト
        navigate('/');
      } catch (e) {
        window.location.href = '/';
      }
    } else {
      window.location.href = '/';
    }
  }, [onLoginSuccess, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="text-lg">Logging you in...</div>
    </div>
  );
}; 