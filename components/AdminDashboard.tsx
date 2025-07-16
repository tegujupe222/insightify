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
    const { showToast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
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
                    if (usersResult.success) {
                        setUsers(usersResult.data);
                    }
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
                    if (projectsResult.success) {
                        // createdAtをDate型に変換
                        const projectsWithDates = projectsResult.data.map((project: any) => ({
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

    const handleDeleteUser = async (userId: string) => {
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
                body: JSON.stringify({ name, url, domains: [] })
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
                                projects.map((project) => (
                                    <div key={project.id} className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                                        <h3 className="text-lg font-medium text-white mb-2">{project.name}</h3>
                                        <p className="text-gray-300 text-sm mb-2">{project.url}</p>
                                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                                            <Icon name="clock" className="h-3 w-3" />
                                            <span>{project.createdAt instanceof Date ? project.createdAt.toLocaleDateString() : new Date(project.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            case 'users':
                return (
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                        <h2 className="text-xl font-semibold mb-4 text-white">User Management</h2>
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
        <ErrorBoundary>
            <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
                <Header onLogout={onLogout} user={user} />
                <main className="pt-16 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-white">Administrator Dashboard</h1>
                        <p className="text-gray-400 mt-1">Manage users, subscriptions, and system settings.</p>
                    </div>

                    {/* Tab Navigation */}
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
            </div>
        </ErrorBoundary>
    );
};
