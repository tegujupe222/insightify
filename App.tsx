import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { SkipLink, LoadingAnnouncer, ErrorAnnouncer } from './components/Accessibility';
import { Icon } from './components/Icon';
import type { AuthUser } from './types';
import { Routes, Route } from 'react-router-dom';
import { AuthCallback } from './components/AuthCallback';
import { ThemeProvider } from './contexts/ThemeContext';

const AppContent: React.FC<{ user: AuthUser | null; onLoginSuccess: (user: AuthUser) => void; onLogout: () => void; loading: boolean; error: string | null; }> = ({ user, onLoginSuccess, onLogout, loading, error }) => {
  const { showToast } = useToast();

  useEffect(() => {
    if (user) {
      showToast({
        type: 'success',
        title: 'ログインしました',
        message: `${user.email}としてログインしています`,
        duration: 3000
      });
    }
  }, [user, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Icon name="loader" className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <Icon name="alert-triangle" className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              認証エラー
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Icon name="refresh" className="h-4 w-4 mr-2" />
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SkipLink />
      <LoadingAnnouncer isLoading={loading} />
      <ErrorAnnouncer error={error} />
      <main id="main-content">
        {user.role === 'admin' ? (
          <AdminDashboard user={user} onLogout={onLogout} />
        ) : (
          <Dashboard 
            user={user} 
            onLogout={onLogout}
            project={{
              id: 'default',
              name: 'Default Project',
              url: window.location.origin,
              trackingCode: 'default-tracking-code'
            }}
            onBackToProjects={() => {
              // For now, just show a toast message since we don't have a project list page
              showToast({
                type: 'info',
                title: 'プロジェクト一覧',
                message: 'プロジェクト一覧機能は現在開発中です',
                duration: 3000
              });
            }}
          />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
    // eslint-disable-next-line
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('jwt');
      if (!token) {
        setLoading(false);
        return;
      }
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.data.user);
      } else {
        localStorage.removeItem('jwt');
      }
    } catch (err) {
      setError('認証の確認に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData: AuthUser) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setUser(null);
  };

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ToastProvider>
          <Routes>
            <Route path="/auth/callback" element={<AuthCallback onLoginSuccess={handleLogin} />} />
            <Route path="*" element={<AppContent user={user} onLoginSuccess={handleLogin} onLogout={handleLogout} loading={loading} error={error} />} />
          </Routes>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;