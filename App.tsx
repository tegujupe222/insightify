import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { ProjectList } from './components/ProjectList';
import { AddProjectModal } from './components/AddProjectModal';
import { TrackingCodeModal } from './components/TrackingCodeModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import { SkipLink, LoadingAnnouncer, ErrorAnnouncer } from './components/Accessibility';
import { Icon } from './components/Icon';
import type { AuthUser, Project } from './types';
import { Routes, Route } from 'react-router-dom';
import { AuthCallback } from './components/AuthCallback';
import { ThemeProvider } from './contexts/ThemeContext';
import { InviteAcceptPage } from './components/InviteAcceptPage';
import { Footer } from './components/Footer';
import PrivacyPolicy from './components/PrivacyPolicy';
import CancelPolicy from './components/CancelPolicy';
import Terms from './components/Terms';

const AppContent: React.FC<{ user: AuthUser | null; onLoginSuccess: (user: AuthUser) => void; onLogout: () => void; loading: boolean; error: string | null; }> = ({ user, onLoginSuccess, onLogout, loading, error }) => {
  const { showToast } = useToast();
  const prevUserRef = React.useRef<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showTrackingCodeModal, setShowTrackingCodeModal] = useState(false);
  const [newlyCreatedProject, setNewlyCreatedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!prevUserRef.current && user) {
      showToast({
        type: 'success',
        title: 'ログインしました',
        message: `${user.email}としてログインしています`,
        duration: 3000
      });
    }
    prevUserRef.current = user;
  }, [user, showToast]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('プロジェクトの取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        setProjects(data.data.data || []);
      } else {
        throw new Error(data.error || 'プロジェクトの取得に失敗しました');
      }
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
      showToast({
        type: 'error',
        title: 'エラー',
        message: error instanceof Error ? error.message : 'プロジェクトの取得に失敗しました',
        duration: 5000
      });
    }
  };

  const handleAddProject = async (name: string, url: string) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, url })
      });

      if (!response.ok) {
        throw new Error('プロジェクトの作成に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        showToast({
          type: 'success',
          title: '成功',
          message: 'プロジェクトが作成されました',
          duration: 3000
        });
        setShowAddProjectModal(false);
        
        // 新しく作成されたプロジェクトを保存
        setNewlyCreatedProject(data.data.project);
        setShowTrackingCodeModal(true);
        
        fetchProjects(); // プロジェクト一覧を再取得
      } else {
        throw new Error(data.error || 'プロジェクトの作成に失敗しました');
      }
    } catch (error) {
      console.error('プロジェクト作成エラー:', error);
      showToast({
        type: 'error',
        title: 'エラー',
        message: error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました',
        duration: 5000
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('プロジェクトの削除に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        // 現在選択されているプロジェクトが削除された場合、選択を解除
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
        fetchProjects(); // プロジェクト一覧を再取得
      } else {
        throw new Error(data.error || 'プロジェクトの削除に失敗しました');
      }
    } catch (error) {
      console.error('プロジェクト削除エラー:', error);
      throw error; // エラーを再スローして、呼び出し元でハンドリング
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  const handleCloseTrackingCodeModal = () => {
    setShowTrackingCodeModal(false);
    setNewlyCreatedProject(null);
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
    return <Login onLoginSuccess={onLoginSuccess} />;
  }

  // プロジェクトが選択されている場合はダッシュボードを表示
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <SkipLink />
        <LoadingAnnouncer isLoading={loading} />
        <ErrorAnnouncer error={error} />
        <main id="main-content">
          <Dashboard 
            user={user} 
            onLogout={onLogout}
            project={selectedProject}
            onBackToProjects={handleBackToProjects}
          />
        </main>
      </div>
    );
  }

  // プロジェクト一覧を表示
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SkipLink />
      <LoadingAnnouncer isLoading={loading} />
      <ErrorAnnouncer error={error} />
      <main id="main-content">
        {user.role === 'admin' ? (
          <AdminDashboard user={user} onLogout={onLogout} />
        ) : (
          <>
            <ProjectList 
              projects={projects}
              onSelectProject={handleSelectProject}
              onAddNewProject={() => setShowAddProjectModal(true)}
              onLogout={onLogout}
              user={user}
              onDeleteProject={handleDeleteProject}
            />
            {showAddProjectModal && (
              <AddProjectModal
                onAddProject={handleAddProject}
                onClose={() => setShowAddProjectModal(false)}
              />
            )}
            {showTrackingCodeModal && newlyCreatedProject && (
              <TrackingCodeModal
                project={newlyCreatedProject}
                onClose={handleCloseTrackingCodeModal}
              />
            )}
          </>
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
      const response = await fetch('/api/user-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        const user = userData.data.user;
        
        // 管理者メールアドレスの場合は管理者権限を確認
        const adminEmails = ['g-igasaki@shinko.ed.jp', 'igafactory2023@gmail.com'];
        if (adminEmails.includes(user.email.toLowerCase()) && user.role !== 'admin') {
          console.log('Admin email detected but user is not admin, updating...');
          
          // 管理者権限を更新
          const updateResponse = await fetch('/api/admin/setup-admin', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (updateResponse.ok) {
            // 更新後にユーザー情報を再取得
            const updatedResponse = await fetch('/api/user-info', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            if (updatedResponse.ok) {
              const updatedUserData = await updatedResponse.json();
              setUser(updatedUserData.data.user);
            } else {
              setUser(user);
            }
          } else {
            setUser(user);
          }
        } else {
          setUser(user);
        }
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
            <Route path="/invite/:token" element={<InviteAcceptPage />} />
            <Route path="/privacy-policy" element={<><PrivacyPolicy /><Footer /></>} />
            <Route path="/cancel-policy" element={<><CancelPolicy /><Footer /></>} />
            <Route path="/terms" element={<><Terms /><Footer /></>} />
            <Route path="*" element={<><AppContent user={user} onLoginSuccess={handleLogin} onLogout={handleLogout} loading={loading} error={error} /><Footer /></>} />
          </Routes>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
};

export default App;