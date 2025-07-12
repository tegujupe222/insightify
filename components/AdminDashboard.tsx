import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Icon } from './Icon';
import { UserManagementTable } from './UserManagementTable';
import { SubscriptionManagementTable } from './SubscriptionManagementTable';
import { NotificationManagementTable } from './NotificationManagementTable';
import { getMockUsers } from '../services/mockData';
import type { AuthUser, User } from '../types';

interface AdminDashboardProps {
    user: AuthUser;
    onLogout: () => void;
}

type AdminTab = 'users' | 'subscriptions' | 'notifications';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<AdminTab>('users');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const mockUsers = await getMockUsers();
            setUsers(mockUsers);
            setLoading(false);
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
        }
    };

    const renderTabContent = () => {
        switch (activeTab) {
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
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <Header onLogout={onLogout} user={user} />
            <main className="p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white">Administrator Dashboard</h1>
                    <p className="text-gray-400 mt-1">Manage users, subscriptions, and system settings.</p>
                </div>

                {/* Tab Navigation */}
                <div className="mb-6">
                    <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
                        {[
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
        </div>
    );
};
