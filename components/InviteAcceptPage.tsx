import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';

interface InviteInfo {
  projectName: string;
  projectUrl: string;
  role: string;
  inviterEmail: string;
  expiresAt: string;
}

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation();
    }
  }, [token]);

  const validateInvitation = async() => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwt');
      if (!token) {
        setError('ログインが必要です。招待を承認するにはログインしてください。');
        setLoading(false);
        return;
      }

      // 招待情報を取得（実際のAPIエンドポイントは別途作成が必要）
      const response = await fetch(`/api/invitations/validate/${token}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '招待の検証に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        setInviteInfo(data.data);
      } else {
        throw new Error(data.error || '招待の検証に失敗しました');
      }
    } catch (error) {
      console.error('招待検証エラー:', error);
      setError(error instanceof Error ? error.message : '招待の検証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async() => {
    try {
      setAccepting(true);
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '招待の承認に失敗しました');
      }

      const data = await response.json();
      if (data.success) {
        alert('プロジェクトに参加しました！');
        navigate('/dashboard');
      } else {
        throw new Error(data.error || '招待の承認に失敗しました');
      }
    } catch (error) {
      console.error('招待承認エラー:', error);
      alert(error instanceof Error ? error.message : '招待の承認に失敗しました');
    } finally {
      setAccepting(false);
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

  const getRoleDescription = (role: string) => {
    switch (role) {
    case 'owner': return 'プロジェクトの完全な管理権限を持ちます';
    case 'editor': return 'プロジェクトの設定を編集できます';
    case 'viewer': return 'アナリティクスデータを閲覧できます';
    default: return '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Icon name="loader" className="h-12 w-12 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">招待情報を確認中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="text-center">
            <Icon name="alert-triangle" className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">招待エラー</h1>
            <p className="text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              ログインページへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!inviteInfo) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
          <div className="text-center">
            <Icon name="alert-circle" className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">招待が見つかりません</h1>
            <p className="text-gray-300 mb-6">この招待は無効または期限切れです。</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              ダッシュボードへ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl border border-gray-700 p-6">
        <div className="text-center mb-6">
          <Icon name="users" className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">プロジェクトへの招待</h1>
          <p className="text-gray-400">プロジェクトに参加する準備ができました</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">{inviteInfo.projectName}</h3>
            <p className="text-gray-300 text-sm mb-3">{inviteInfo.projectUrl}</p>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">権限:</span>
              <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                {getRoleLabel(inviteInfo.role)}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-2">{getRoleDescription(inviteInfo.role)}</p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">招待者:</span>
              <span className="text-white text-sm">{inviteInfo.inviterEmail}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">有効期限:</span>
              <span className="text-white text-sm">
                {new Date(inviteInfo.expiresAt).toLocaleDateString('ja-JP')}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleAcceptInvitation}
            disabled={accepting}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {accepting ? (
              <>
                <Icon name="loader" className="h-4 w-4 mr-2 animate-spin" />
                参加中...
              </>
            ) : (
              <>
                <Icon name="check" className="h-4 w-4 mr-2" />
                プロジェクトに参加する
              </>
            )}
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full px-4 py-3 text-sm font-medium text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            後で参加する
          </button>
        </div>
      </div>
    </div>
  );
}; 
