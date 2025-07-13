import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface ProjectMember {
  id: string;
  email: string;
  role: string;
  userRole: string;
  joinedAt: string;
  invitedBy: string | null;
  invitedByEmail: string | null;
  isOwner: boolean;
}

interface ProjectMembersModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onInviteUser: () => void;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({ 
  projectId, 
  projectName, 
  onClose, 
  onInviteUser 
}) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/projects/${projectId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('メンバー情報の取得に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        setMembers(data.data.members);
      } else {
        throw new Error(data.error || 'メンバー情報の取得に失敗しました');
      }
    } catch (error) {
      console.error('メンバー取得エラー:', error);
      setError(error instanceof Error ? error.message : 'メンバー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      setUpdatingRole(memberId);
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberId, role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '権限の更新に失敗しました');
      }

      // 成功したらメンバー一覧を再取得
      await fetchMembers();
    } catch (error) {
      console.error('権限更新エラー:', error);
      alert(error instanceof Error ? error.message : '権限の更新に失敗しました');
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('このメンバーを削除しますか？')) {
      return;
    }

    try {
      setRemovingMember(memberId);
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ memberId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'メンバーの削除に失敗しました');
      }

      // 成功したらメンバー一覧を再取得
      await fetchMembers();
    } catch (error) {
      console.error('メンバー削除エラー:', error);
      alert(error instanceof Error ? error.message : 'メンバーの削除に失敗しました');
    } finally {
      setRemovingMember(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'オーナー';
      case 'editor': return '編集者';
      case 'viewer': return '閲覧者';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl p-6">
          <div className="flex items-center justify-center space-x-3">
            <Icon name="loader" className="h-8 w-8 text-indigo-400 animate-spin" />
            <span className="text-xl font-medium text-gray-300">メンバー情報を読み込み中...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-4xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Project Members</h2>
            <p className="text-gray-400 mt-1">{projectName}</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onInviteUser}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center"
            >
              <Icon name="userPlus" className="h-4 w-4 mr-2" />
              Invite User
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <Icon name="xMark" className="h-6 w-6" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 border border-red-700 rounded-md">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="text-xs text-gray-400 uppercase bg-gray-700">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3">Invited By</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-gray-700 hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-white">{member.email}</div>
                      {member.isOwner && (
                        <span className="text-xs text-gray-400">Project Owner</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {member.isOwner ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        {getRoleLabel(member.role)}
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        disabled={updatingRole === member.id}
                        className="px-2 py-1 text-xs font-medium bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="viewer">閲覧者</option>
                        <option value="editor">編集者</option>
                        <option value="owner">オーナー</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(member.joinedAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {member.invitedByEmail || '-'}
                  </td>
                  <td className="px-6 py-4">
                    {!member.isOwner && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        disabled={removingMember === member.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {removingMember === member.id ? (
                          <>
                            <Icon name="loader" className="h-4 w-4 mr-1 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Icon name="trash" className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {members.length === 0 && !loading && (
          <div className="text-center py-8">
            <Icon name="users" className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No members found</p>
            <button
              onClick={onInviteUser}
              className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Invite your first member
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 