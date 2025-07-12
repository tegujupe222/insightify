import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface SubscriptionUpgradeProps {
  currentPlan: 'free' | 'premium' | 'pending';
  monthlyPageViews: number;
  pageViewsLimit: number;
  onUpgrade: (planType: 'monthly' | 'yearly') => void;
}

export const SubscriptionUpgrade: React.FC<SubscriptionUpgradeProps> = ({
  currentPlan,
  monthlyPageViews,
  pageViewsLimit,
  onUpgrade
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const usagePercentage = (monthlyPageViews / pageViewsLimit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  const plans = {
    monthly: {
      price: 5500,
      period: '月',
      savings: null
    },
    yearly: {
      price: 55000,
      period: '年',
      savings: '10%割引'
    }
  };

  const getUsageColor = () => {
    if (isAtLimit) return 'text-red-500';
    if (isNearLimit) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getUsageBarColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (currentPlan === 'premium') {
    return (
      <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl text-white">
        <div className="flex items-center space-x-3 mb-4">
          <Icon name="shield" className="h-8 w-8" />
          <div>
            <h3 className="text-xl font-bold">プレミアムプラン</h3>
            <p className="text-green-100">全機能が利用可能です</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>ページビュー数</span>
            <span className="font-bold">無制限</span>
          </div>
          <div className="flex justify-between">
            <span>現在の使用量</span>
            <span className="font-bold">{monthlyPageViews.toLocaleString()} PV</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">現在のプラン</h3>
            <p className="text-gray-400">
              {currentPlan === 'pending' ? 'アップグレード処理中' : '無料プラン'}
            </p>
          </div>
          {currentPlan === 'pending' && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-500 text-white">
              処理中
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">ページビュー使用量</span>
              <span className={`font-medium ${getUsageColor()}`}>
                {monthlyPageViews.toLocaleString()} / {pageViewsLimit.toLocaleString()} PV
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUsageBarColor()}`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.round(usagePercentage)}% 使用中
            </p>
          </div>

          {isNearLimit && !isAtLimit && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Icon name="alert-triangle" className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-400 text-sm font-medium">
                  制限に近づいています。アップグレードをご検討ください。
                </span>
              </div>
            </div>
          )}

          {isAtLimit && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Icon name="alert-triangle" className="h-5 w-5 text-red-500" />
                <span className="text-red-400 text-sm font-medium">
                  制限に達しました。新規データの収集が停止されます。
                </span>
              </div>
            </div>
          )}

          {currentPlan === 'free' && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              プレミアムプランにアップグレード
            </button>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">プレミアムプランを選択</h3>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <Icon name="x" className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {(['monthly', 'yearly'] as const).map((plan) => (
                <div
                  key={plan}
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPlan === plan
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setSelectedPlan(plan)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-white capitalize">
                        {plan === 'monthly' ? '月額' : '年額'}プラン
                      </h4>
                      <p className="text-gray-400 text-sm">
                        {plan === 'monthly' ? '月払い' : '年払い（10%割引）'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ¥{plans[plan].price.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        / {plans[plan].period}
                      </div>
                      {plans[plan].savings && (
                        <div className="text-xs text-green-400 font-medium">
                          {plans[plan].savings}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-white mb-2">プレミアムプランの特典</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center space-x-2">
                  <Icon name="check" className="h-4 w-4 text-green-400" />
                  <span>無制限のページビュー</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="check" className="h-4 w-4 text-green-400" />
                  <span>全機能の利用</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="check" className="h-4 w-4 text-green-400" />
                  <span>優先サポート</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Icon name="check" className="h-4 w-4 text-green-400" />
                  <span>詳細な分析レポート</span>
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  onUpgrade(selectedPlan);
                  setShowUpgradeModal(false);
                }}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                アップグレード
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 