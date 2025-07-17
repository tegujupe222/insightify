import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface Notification {
  id: string;
  userId: string;
  type: 'upgrade_recommended' | 'subscription_requested' | 'subscription_activated' | 'payment_confirmed' | 'limit_warning';
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
  sentAt: string;
  userEmail?: string;
  user?: {
    id: string;
    email: string;
  };
}

interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  byType: Record<string, number>;
}

export const NotificationManagementTable: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showStats, setShowStats] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmailData, setTestEmailData] = useState({
    email: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, []);

  const fetchNotifications = async() => {
    try {
      const response = await fetch('/api/notifications?limit=100');
      const data = await response.json();
      console.log('Notifications API response:', data);
      if (data.success) {
        // APIレスポンスの構造に合わせて修正
        const notificationsData = data.data.notifications || data.data;
        setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async() => {
    try {
      const response = await fetch('/api/notifications/stats');
      const data = await response.json();
      console.log('Stats API response:', data);
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleRetryFailures = async() => {
    if (window.confirm('失敗したメールを再送しますか？')) {
      try {
        const response = await fetch('/api/notifications/retry-failures', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          alert(`再送完了: 成功 ${data.data.success}件, 失敗 ${data.data.failed}件`);
          fetchNotifications();
          fetchStats();
        }
      } catch (error) {
        console.error('Failed to retry failures:', error);
        alert('再送に失敗しました');
      }
    }
  };

  const handleSendTestEmail = async() => {
    if (!testEmailData.email || !testEmailData.subject || !testEmailData.content) {
      alert('すべてのフィールドを入力してください');
      return;
    }

    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify(testEmailData)
      });
      const data = await response.json();
      if (data.success) {
        alert(data.data.sent ? 'テストメールを送信しました' : 'テストメールの送信に失敗しました');
        setShowTestEmail(false);
        setTestEmailData({ email: '', subject: '', content: '' });
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      alert('テストメールの送信に失敗しました');
    }
  };

  const handleDeleteOld = async() => {
    const days = prompt('何日前の通知を削除しますか？（デフォルト: 90日）', '90');
    if (days) {
      try {
        const response = await fetch(`/api/notifications/old?days=${days}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('jwt')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          alert(`${data.data.deletedCount}件の通知を削除しました`);
          fetchNotifications();
          fetchStats();
        }
      } catch (error) {
        console.error('Failed to delete old notifications:', error);
        alert('削除に失敗しました');
      }
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const typeMatch = selectedType === 'all' || n.type === selectedType;
    const statusMatch = selectedStatus === 'all' || n.status === selectedStatus;
    return typeMatch && statusMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
    case 'sent':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">送信済み</span>;
    case 'failed':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">失敗</span>;
    case 'pending':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">待機中</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">不明</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
    case 'upgrade_recommended':
      return 'アップグレード推奨';
    case 'subscription_requested':
      return 'サブスクリプション申し込み';
    case 'subscription_activated':
      return 'サブスクリプション有効化';
    case 'payment_confirmed':
      return '支払い確認';
    case 'limit_warning':
      return '制限警告';
    default:
      return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="loader" className="h-8 w-8 animate-spin text-indigo-400" />
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Icon name="mail" className="h-8 w-8 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">総数</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Icon name="check" className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">送信済み</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.sent}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Icon name="alert-triangle" className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">失敗</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.failed}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <Icon name="clock" className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">待機中</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowStats(!showStats)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="barChart" className="h-4 w-4 mr-2" />
          詳細統計
        </button>
        <button
          onClick={handleRetryFailures}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
        >
          <Icon name="refresh" className="h-4 w-4 mr-2" />
          失敗を再送
        </button>
        <button
          onClick={() => setShowTestEmail(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Icon name="mail" className="h-4 w-4 mr-2" />
          テストメール
        </button>
        <button
          onClick={handleDeleteOld}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Icon name="trash" className="h-4 w-4 mr-2" />
          古い通知削除
        </button>
      </div>

      {/* Detailed Stats */}
      {showStats && stats && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">詳細統計</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">タイプ別統計</h4>
              <div className="space-y-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{getTypeLabel(type)}</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">送信率</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">成功率</span>
                  <span className="text-sm font-medium text-green-600">
                    {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">失敗率</span>
                  <span className="text-sm font-medium text-red-600">
                    {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">タイプ</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="all">すべて</option>
            <option value="upgrade_recommended">アップグレード推奨</option>
            <option value="subscription_requested">サブスクリプション申し込み</option>
            <option value="subscription_activated">サブスクリプション有効化</option>
            <option value="payment_confirmed">支払い確認</option>
            <option value="limit_warning">制限警告</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ステータス</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="all">すべて</option>
            <option value="sent">送信済み</option>
            <option value="failed">失敗</option>
            <option value="pending">待機中</option>
          </select>
        </div>
      </div>

      {/* Notifications Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ユーザー
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                タイプ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                件名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                送信日時
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                エラー
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotifications.map((notification) => (
              <tr key={notification.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {notification.userEmail || notification.user?.email || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 dark:text-white">
                    {getTypeLabel(notification.type)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white max-w-xs truncate">
                    {notification.subject}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(notification.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {notification.sentAt ? new Date(notification.sentAt).toLocaleString() : '-'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {notification.errorMessage && (
                    <div className="text-sm text-red-600 max-w-xs truncate" title={notification.errorMessage}>
                      {notification.errorMessage}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredNotifications.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Icon name="mail" className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>通知が見つかりません</p>
          </div>
        )}
      </div>

      {/* Test Email Modal */}
      {showTestEmail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">テストメール送信</h3>
              <button
                onClick={() => setShowTestEmail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="x" className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  送信先メールアドレス
                </label>
                <input
                  type="email"
                  value={testEmailData.email}
                  onChange={(e) => setTestEmailData(prev => ({ ...prev, email: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="test@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  件名
                </label>
                <input
                  type="text"
                  value={testEmailData.subject}
                  onChange={(e) => setTestEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="テストメールの件名"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  内容
                </label>
                <textarea
                  value={testEmailData.content}
                  onChange={(e) => setTestEmailData(prev => ({ ...prev, content: e.target.value }))}
                  rows={4}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="テストメールの内容"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTestEmail(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSendTestEmail}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                送信
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
