import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface Subscription {
  id: string;
  userId: string;
  planType: 'monthly' | 'yearly';
  amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'expired';
  invoiceNumber: string;
  paymentMethod: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const SubscriptionManagementTable: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('認証トークンが見つかりません');
      }

      const response = await fetch('/api/admin/subscriptions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSubscriptions(data.data.subscriptions || []);
        } else {
          console.error('Failed to fetch subscriptions:', data.error);
        }
      } else {
        console.error('Failed to fetch subscriptions:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (subscriptionId: string) => {
    if (window.confirm('Confirm payment for this subscription?')) {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }

        const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/confirm`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 成功したら一覧を再取得
            await fetchSubscriptions();
          } else {
            alert('支払い確認に失敗しました: ' + data.error);
          }
        } else {
          alert('支払い確認に失敗しました');
        }
      } catch (error) {
        console.error('Failed to confirm payment:', error);
        alert('支払い確認に失敗しました');
      }
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    if (window.confirm('Cancel this subscription?')) {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }

        const response = await fetch(`/api/admin/subscriptions/${subscriptionId}/cancel`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 成功したら一覧を再取得
            await fetchSubscriptions();
          } else {
            alert('サブスクリプションキャンセルに失敗しました: ' + data.error);
          }
        } else {
          alert('サブスクリプションキャンセルに失敗しました');
        }
      } catch (error) {
        console.error('Failed to cancel subscription:', error);
        alert('サブスクリプションキャンセルに失敗しました');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      paid: { color: 'bg-green-500', text: 'Paid' },
      cancelled: { color: 'bg-red-500', text: 'Cancelled' },
      expired: { color: 'bg-gray-500', text: 'Expired' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} text-white`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Icon name="loader" className="h-6 w-6 text-indigo-400 animate-spin" />
        <span className="ml-2 text-gray-300">Loading subscriptions...</span>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Plan
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Invoice
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {subscriptions.map((subscription) => (
            <tr key={subscription.id} className="hover:bg-gray-700">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-white">
                  {subscription.user?.email || 'Unknown'}
                </div>
                <div className="text-sm text-gray-400">
                  {subscription.user?.role || 'user'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-white capitalize">
                  {subscription.planType}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-white">
                  ¥{subscription.amount.toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(subscription.status)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300 font-mono">
                  {subscription.invoiceNumber}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="text-sm text-gray-300">
                  {new Date(subscription.createdAt).toLocaleDateString()}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {subscription.status === 'pending' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleConfirmPayment(subscription.id)}
                      className="text-green-400 hover:text-green-300"
                      title="Confirm Payment"
                    >
                      <Icon name="check" className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCancelSubscription(subscription.id)}
                      className="text-red-400 hover:text-red-300"
                      title="Cancel Subscription"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {subscription.status === 'paid' && (
                  <span className="text-green-400">Confirmed</span>
                )}
                {subscription.status === 'cancelled' && (
                  <span className="text-red-400">Cancelled</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {subscriptions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Icon name="credit-card" className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No subscriptions found</p>
        </div>
      )}
    </div>
  );
}; 