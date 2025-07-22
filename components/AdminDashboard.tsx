import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Icon } from './Icon';
import { UserManagementTable } from './UserManagementTable';
import { SubscriptionManagementTable } from './SubscriptionManagementTable';
import { NotificationManagementTable } from './NotificationManagementTable';
import { AddProjectModal } from './AddProjectModal';
import { ErrorBoundary } from './ErrorBoundary';
import { useToast } from './Toast';
import type { AuthUser, User, Project } from '../types';
import { Navigation } from './Navigation';
import { TrackingCodeModal } from './TrackingCodeModal'; // 追加

interface AdminDashboardProps {
    user: AuthUser;
    onLogout: () => void;
}

type AdminTab = 'dashboard' | 'projects' | 'users' | 'subscriptions' | 'notifications';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newlyCreatedProject, setNewlyCreatedProject] = useState<Project | null>(null); // 追加
  const { showToast } = useToast();

  useEffect(() => {
    const fetchData = async() => {
      try {
        setLoading(true);
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }

        // ユーザー一覧を取得
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (usersResponse.ok) {
          const usersResult = await usersResponse.json();
          console.log('Users API response:', usersResult);
          if (usersResult.success) {
            // APIレスポンスの構造に合わせて修正
            const usersData = usersResult.data.users || usersResult.data;
            console.log('Users data:', usersData);
            const formattedUsers = (Array.isArray(usersData) ? usersData : []).map((user: any) => ({
              id: user.id,
              name: user.name || user.email || 'Unknown User',
              email: user.email,
              lastLogin: user.lastLogin || user.updatedAt || 'Never',
              projectCount: user.projectCount || 0,
              status: user.status || (user.isBanned ? 'Inactive' : 'Active'),
              role: user.role || 'user',
              isBanned: user.isBanned || false
            }));
            setUsers(formattedUsers);
          }
        } else {
          console.warn('Failed to fetch users:', usersResponse.status);
        }

        // プロジェクト一覧を取得
        const projectsResponse = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (projectsResponse.ok) {
          const projectsResult = await projectsResponse.json();
          console.log('Projects API response:', projectsResult);
          if (projectsResult.success) {
            // APIレスポンスの構造に合わせて修正（二重構造に対応）
            const projectsData = projectsResult.data.data || projectsResult.data.projects || projectsResult.data;
            console.log('Projects data:', projectsData);
            const projectsWithDates = (Array.isArray(projectsData) ? projectsData : []).map((project: any) => ({
              ...project,
              createdAt: new Date(project.createdAt),
              updatedAt: new Date(project.updatedAt)
            }));
            setProjects(projectsWithDates);
          }
        } else {
          console.warn('Failed to fetch projects:', projectsResponse.status);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        showToast({
          type: 'error',
          title: 'エラー',
          message: error instanceof Error ? error.message : 'データの取得に失敗しました',
          duration: 5000
        });
                
        // エラー時は空の配列を設定
        setUsers([]);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  const handleDeleteUser = async(userId: string) => {
    if (!window.confirm('このユーザーを削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('ユーザーの削除に失敗しました');
      }

      const result = await response.json();
      if (result.success) {
        setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        showToast({
          type: 'success',
          title: '削除完了',
          message: 'ユーザーが削除されました',
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'ユーザーの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast({
        type: 'error',
        title: '削除エラー',
        message: error instanceof Error ? error.message : 'ユーザーの削除に失敗しました',
        duration: 5000
      });
    }
  };

  // プロジェクト削除ハンドラ
  const handleDeleteProject = async(projectId: string) => {
    if (!window.confirm('このプロジェクトを削除しますか？この操作は取り消せません。')) {
      return;
    }
    try {
      const token = localStorage.getItem('jwt');
      if (!token) throw new Error('認証トークンが見つかりません');
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('プロジェクトの削除に失敗しました');
      const result = await response.json();
      if (result.success) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        showToast({
          type: 'success',
          title: '削除完了',
          message: 'プロジェクトが削除されました',
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'プロジェクトの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
      showToast({
        type: 'error',
        title: '削除エラー',
        message: error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました',
        duration: 5000
      });
    }
  };

  const handleAddProject = async(name: string, url: string, domains: string[] = []) => {
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
        body: JSON.stringify({ name, url, domains })
      });

      if (!response.ok) {
        throw new Error('プロジェクトの作成に失敗しました');
      }

      const result = await response.json();
      if (result.success) {
        // createdAtをDate型に変換して追加
        const newProject = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt)
        };
        setProjects(prevProjects => [...prevProjects, newProject]);
        setShowAddProjectModal(false);
        setNewlyCreatedProject(newProject); // 追加: モーダル表示用
        showToast({
          type: 'success',
          title: '作成完了',
          message: 'プロジェクトが作成されました',
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'プロジェクトの作成に失敗しました');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      showToast({
        type: 'error',
        title: '作成エラー',
        message: error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました',
        duration: 5000
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
    case 'dashboard':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Icon name="users" className="h-8 w-8 text-indigo-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Total Users</h3>
                <p className="text-3xl font-bold text-indigo-400">{users.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Icon name="folder" className="h-8 w-8 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Total Projects</h3>
                <p className="text-3xl font-bold text-green-400">{projects.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Icon name="shield" className="h-8 w-8 text-purple-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Admin Account</h3>
                <p className="text-sm text-purple-300">Unlimited Access</p>
              </div>
            </div>
          </div>
        </div>
      );
    case 'projects':
      return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">Project Management</h2>
            <button
              onClick={() => setShowAddProjectModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Icon name="plus" className="h-4 w-4" />
              <span>Add Project</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <Icon name="folder" className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">プロジェクトがありません</p>
                <p className="text-gray-500 text-sm">新しいプロジェクトを作成してください</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr>
                    <th>プロジェクト名</th>
                    <th>URL</th>
                    <th>ドメイン</th>
                    <th>作成日</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{project.url}</td>
                      <td>
                        {(project.domains ?? []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(project.domains ?? []).map((domain: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-block bg-gray-600 text-gray-100 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-indigo-600"
                                title={(project.domains ?? []).join('\n')}
                              >
                                {domain}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td>{project.createdAt ? new Date(project.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                                                        削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    case 'users':
      return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-white">User Management</h2>
            <div className="text-sm text-gray-400">
                                Total: {users.length} users
            </div>
          </div>
          <UserManagementTable users={users} onDeleteUser={handleDeleteUser} />
        </div>
      );
    case 'subscriptions':
      return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Subscription Management</h2>
          <SubscriptionManagementTable />
        </div>
      );
    case 'notifications':
      return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-white">Notification Management</h2>
          <NotificationManagementTable />
        </div>
      );
    default:
      return null;
    }
  };
    
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation
        currentPage={activeTab}
        onNavigate={(page) => setActiveTab(page as AdminTab)}
        onLogout={onLogout}
        user={user}
      />
      <div className="md:ml-64">
        <Header user={user} onLogout={onLogout} />
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorBoundary>
            {/* タブ切り替えUI・内容 */}
            <div className="mb-6">
              <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: 'home' as const },
                  { id: 'projects', label: 'Projects', icon: 'folder' as const },
                  { id: 'users', label: 'Users', icon: 'users' as const },
                  { id: 'subscriptions', label: 'Subscriptions', icon: 'credit-card' as const },
                  { id: 'notifications', label: 'Notifications', icon: 'bell' as const }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as AdminTab)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Icon name={tab.icon} className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {loading ? (
              <div className="flex items-center justify-center min-h-[50vh] text-white">
                <div className="flex items-center space-x-3">
                  <Icon name="loader" className="h-8 w-8 text-indigo-400" />
                  <span className="text-xl font-medium text-gray-300">Loading Data...</span>
                </div>
              </div>
            ) : (
              renderTabContent()
            )}
          </ErrorBoundary>
        </main>
        <footer className="text-center p-6 text-gray-500 text-sm">
          <p>Insightify Analytics Platform &copy; 2024</p>
        </footer>

        {/* Add Project Modal */}
        {showAddProjectModal && (
          <AddProjectModal
            onClose={() => setShowAddProjectModal(false)}
            onAddProject={handleAddProject}
          />
        )}
        {/* Tracking Code Modal: 新規プロジェクト作成時のみ表示 */}
        {newlyCreatedProject && (
          <TrackingCodeModal
            project={newlyCreatedProject}
            onClose={() => setNewlyCreatedProject(null)}
          />
        )}
      </div>
    </div>
  );
};
