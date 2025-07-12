import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { SkipLink, LoadingAnnouncer, ErrorAnnouncer } from './components/Accessibility';
import { Icon } from './components/Icon';
import type { AuthUser } from './types';

const AppContent: React.FC = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    checkAuthStatus();
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
        showToast({
          type: 'success',
          title: 'ログインしました',
          message: `${userData.data.user.email}としてログインしています`,
          duration: 3000
        });
      } else {
        localStorage.removeItem('jwt');
        showToast({
          type: 'error',
          title: 'セッションが期限切れです',
          message: '再度ログインしてください',
          duration: 5000
        });
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setError('認証の確認に失敗しました');
      showToast({
        type: 'error',
        title: '認証エラー',
        message: '認証の確認に失敗しました。再度ログインしてください。',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (userData: AuthUser) => {
    setUser(userData);
    showToast({
      type: 'success',
      title: 'ログインしました',
      message: `${userData.email}としてログインしています`,
      duration: 3000
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setUser(null);
    showToast({
      type: 'info',
      title: 'ログアウトしました',
      message: 'セッションを終了しました',
      duration: 3000
    });
  };

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
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SkipLink />
      <LoadingAnnouncer isLoading={loading} />
      <ErrorAnnouncer error={error} />
      
      <main id="main-content">
        {user.role === 'admin' ? (
          <AdminDashboard user={user} onLogout={handleLogout} />
        ) : (
          <Dashboard 
            user={user} 
            onLogout={handleLogout}
            project={null as any}
            onBackToProjects={() => {}}
          />
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;