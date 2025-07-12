import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface Notification {
  id: string;
  userId: string;
  type: 'upgrade_recommended' | 'subscription_requested' | 'subscription_activated' | 'payment_confirmed' | 'limit_warning';
  subject: string;
  content: string;
  sentAt: string;
  readAt?: string;
  user?: {
    id: string;
    email: string;
  };
}

export const NotificationManagementTable: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    // Mock data for now - replace with actual API call
    const mockNotifications: Notification[] = [
      {
        id: 'notif_1',
        userId: 'user_1',
        type: 'upgrade_recommended',
        subject: '【Insightify】アップグレードをお勧めします',
        content: '現在のページビュー数が2500に達しており...',
        sentAt: '2024-01-15T10:30:00Z',
        user: {
          id: 'user_1',
          email: 'user1@example.com'
        }
      },
      {
        id: 'notif_2',
        userId: 'user_2',
        type: 'subscription_requested',
        subject: '【Insightify】サブスクリプション申し込みを受け付けました',
        content: 'Insightifyプレミアムプランのお申し込みを受け付けました...',
        sentAt: '2024-01-14T14:20:00Z',
        readAt: '2024-01-14T15:00:00Z',
        user: {
          id: 'user_2',
          email: 'user2@example.com'
        }
      },
      {
        id: 'notif_3',
        userId: 'user_3',
        type: 'limit_warning',
        subject: '【Insightify】ページビュー制限に近づいています',
        content: '現在のページビュー数が2800に達しており...',
        sentAt: '2024-01-13T09:15:00Z',
        user: {
          id: 'user_3',
          email: 'user3@example.com'
        }
      }
    ];

    setNotifications(mockNotifications);
    setLoading(false);
  }, []);

  const filteredNotifications = selectedType === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === selectedType);

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      upgrade_recommended: { color: 'bg-blue-500', text: 'Upgrade Recommended' },
      subscription_requested: { color: 'bg-yellow-500', text: 'Subscription Requested' },
      subscription_activated: { color: 'bg-green-500', text: 'Subscription Activated' },
      payment_confirmed: { color: 'bg-green-600', text: 'Payment Confirmed' },
      limit_warning: { color: 'bg-red-500', text: 'Limit Warning' }
    };

    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.upgrade_recommended;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  const handleSendUpgradeRecommendations = () => {
    if (window.confirm('Send upgrade recommendations to users near limit?')) {
      // Mock implementation - replace with actual API call
      alert('Upgrade recommendations sent!');
    }
  };

  const handleSendLimitWarnings = () => {
    if (window.confirm('Send limit warnings to users at limit?')) {
      // Mock implementation - replace with actual API call
      alert('Limit warnings sent!');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="loader" className="h-6 w-6 text-indigo-400 animate-spin" />
        <span className="ml-2 text-gray-300">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={handleSendUpgradeRecommendations}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Icon name="mail" className="h-4 w-4 mr-2" />
          Send Upgrade Recommendations
        </button>
        <button
          onClick={handleSendLimitWarnings}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Icon name="alert-triangle" className="h-4 w-4 mr-2" />
          Send Limit Warnings
        </button>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
        >
          <option value="all">All Types</option>
          <option value="upgrade_recommended">Upgrade Recommended</option>
          <option value="subscription_requested">Subscription Requested</option>
          <option value="subscription_activated">Subscription Activated</option>
          <option value="payment_confirmed">Payment Confirmed</option>
          <option value="limit_warning">Limit Warning</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Sent Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {filteredNotifications.map((notification) => (
              <tr key={notification.id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-white">
                    {notification.user?.email || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTypeBadge(notification.type)}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-white max-w-xs truncate">
                    {notification.subject}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {notification.readAt ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                      Read
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                      Unread
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-300">
                    {new Date(notification.sentAt).toLocaleDateString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      // Mock implementation - replace with actual API call
                      alert(`Content: ${notification.content}`);
                    }}
                    className="text-indigo-400 hover:text-indigo-300"
                    title="View Content"
                  >
                    <Icon name="eye" className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredNotifications.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Icon name="bell" className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        )}
      </div>
    </div>
  );
}; 