import { useEffect, useState } from 'react';
import { fetchUsers, deleteUser, banUser, changeUserRole } from '../services/userApi';
import { UserEditModal } from './UserEditModal';
import type { User } from '@/types';

const AdminDashboard = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        const fetchUsersData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token');
                const users = await fetchUsers(token);
                setUsers(users);
            } catch (e) {
                alert('ユーザー一覧の取得に失敗しました');
            } finally {
                setLoading(false);
            }
        };
        fetchUsersData();
    }, []);

    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token');
                await deleteUser(userId, token);
                setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
            } catch (e) {
                alert('ユーザー削除に失敗しました');
            }
        }
    };

    const handleBanUser = async (userId: string, isBanned: boolean) => {
        const action = isBanned ? 'ban' : 'unban';
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token');
                await banUser(userId, isBanned, token);
                setUsers(prevUsers => prevUsers.map(u => 
                    u.id === userId ? { ...u, isBanned } : u
                ));
            } catch (e) {
                alert(`Failed to ${action} user`);
            }
        }
    };

    const handleChangeRole = async (userId: string, newRole: 'admin' | 'user') => {
        if (window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
            try {
                const token = localStorage.getItem('token');
                if (!token) throw new Error('No token');
                await changeUserRole(userId, newRole, token);
                setUsers(prevUsers => prevUsers.map(u => 
                    u.id === userId ? { ...u, role: newRole } : u
                ));
            } catch (e) {
                alert('Failed to change user role');
            }
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    const handleUserUpdate = (updatedUser: User) => {
        setUsers(prevUsers => prevUsers.map(u => 
            u.id === updatedUser.id ? updatedUser : u
        ));
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>Admin Dashboard</h1>
            <h2>User Management</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Last Login</th>
                        <th>Projects</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.lastLogin}</td>
                            <td>{user.projectCount}</td>
                            <td>{user.status}</td>
                            <td>
                                <button onClick={() => handleEditUser(user)}>Edit</button>
                                <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
                                <button onClick={() => handleBanUser(user.id, !user.isBanned)}>
                                    {user.isBanned ? 'Unban' : 'Ban'}
                                </button>
                                <button onClick={() => handleChangeRole(user.id, user.role === 'admin' ? 'user' : 'admin')}>
                                    {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <UserEditModal
                user={editingUser}
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                }}
                onUpdate={handleUserUpdate}
            />
        </div>
    );
};

export default AdminDashboard; 