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
    // Mock data for now - replace with actual API call
    const mockSubscriptions: Subscription[] = [
      {
        id: 'sub_1',
        userId: 'user_1',
        planType: 'monthly',
        amount: 5500,
        status: 'pending',
        invoiceNumber: 'INV-123456789-001',
        paymentMethod: 'bank_transfer',
        createdAt: '2024-01-15T10:30:00Z',
        user: {
          id: 'user_1',
          email: 'user1@example.com',
          role: 'user'
        }
      },
      {
        id: 'sub_2',
        userId: 'user_2',
        planType: 'yearly',
        amount: 55000,
        status: 'paid',
        invoiceNumber: 'INV-123456789-002',
        paymentMethod: 'bank_transfer',
        createdAt: '2024-01-10T14:20:00Z',
        user: {
          id: 'user_2',
          email: 'user2@example.com',
          role: 'user'
        }
      }
    ];

    setSubscriptions(mockSubscriptions);
    setLoading(false);
  }, []);

  const handleConfirmPayment = (subscriptionId: string) => {
    if (window.confirm('Confirm payment for this subscription?')) {
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, status: 'paid' as const }
            : sub
        )
      );
    }
  };

  const handleCancelSubscription = (subscriptionId: string) => {
    if (window.confirm('Cancel this subscription?')) {
      setSubscriptions(prev => 
        prev.map(sub => 
          sub.id === subscriptionId 
            ? { ...sub, status: 'cancelled' as const }
            : sub
        )
      );
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