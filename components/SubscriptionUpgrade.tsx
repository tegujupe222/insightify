import React, { useState } from 'react';
import { Icon } from './Icon';

interface SubscriptionUpgradeProps {
  currentPlan: 'free' | 'premium' | 'pending';
  monthlyPageViews: number;
  pageViewsLimit: number;
  onUpgrade: (planType: 'monthly' | 'yearly') => void;
}

interface BankTransferInfo {
  bankName: string;
  branch: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

export const SubscriptionUpgrade: React.FC<SubscriptionUpgradeProps> = ({
  currentPlan,
  monthlyPageViews,
  pageViewsLimit,
  onUpgrade
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showBankInfo, setShowBankInfo] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankTransferInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // 管理者の場合は課金UIを非表示
  const isAdmin = currentPlan === 'premium' && pageViewsLimit > 1000000;
  
  if (isAdmin) {
    return (
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-xl text-white">
        <div className="flex items-center space-x-3 mb-4">
          <Icon name="shield" className="h-8 w-8" />
          <div>
            <h3 className="text-xl font-bold">管理者アカウント</h3>
            <p className="text-purple-100">全機能が無制限で利用可能です</p>
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

  const fetchBankInfo = async() => {
    try {
      const response = await fetch('/api/payments/bank-info');
      const data = await response.json();
      if (data.success) {
        setBankInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bank info:', error);
    }
  };

  const handleUpgradeClick = async() => {
    setLoading(true);
    try {
      // 銀行振込情報を取得
      await fetchBankInfo();
      setShowUpgradeModal(true);
    } catch (error) {
      console.error('Failed to start upgrade process:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmUpgrade = async() => {
    setLoading(true);
    try {
      // サブスクリプションリクエストを作成
      const response = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`
        },
        body: JSON.stringify({ planType: selectedPlan })
      });

      if (response.ok) {
        setShowUpgradeModal(false);
        setShowBankInfo(true);
        onUpgrade(selectedPlan);
      } else {
        throw new Error('Failed to create subscription request');
      }
    } catch (error) {
      console.error('Failed to upgrade:', error);
      alert('アップグレードリクエストの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('コピーしました');
    });
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
                <Icon name="alert-circle" className="h-5 w-5 text-red-500" />
                <span className="text-red-400 text-sm font-medium">
                  ページビュー制限に達しました。アップグレードが必要です。
                </span>
              </div>
            </div>
          )}

          {currentPlan === 'free' && (
            <button
              onClick={handleUpgradeClick}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Icon name="loader" className="h-5 w-5 animate-spin" />
                  <span>処理中...</span>
                </>
              ) : (
                <>
                  <Icon name="arrow-up" className="h-5 w-5" />
                  <span>プレミアムにアップグレード</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* アップグレード選択モーダル */}
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

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <Icon name="info" className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">銀行振込でのお支払い</p>
                  <p>プラン選択後、銀行振込先情報をお送りします。お振込確認後、プレミアム機能が有効になります。</p>
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Icon name="loader" className="h-4 w-4 animate-spin" />
                    <span>処理中...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" className="h-4 w-4" />
                    <span>選択したプランで申し込む</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 銀行振込情報モーダル */}
      {showBankInfo && bankInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">銀行振込先情報</h3>
              <button
                onClick={() => setShowBankInfo(false)}
                className="text-gray-400 hover:text-white"
              >
                <Icon name="x" className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Icon name="check-circle" className="h-5 w-5 text-green-400" />
                  <span className="text-green-400 font-medium">申し込み完了</span>
                </div>
                <p className="text-green-300 text-sm">
                  プレミアムプランの申し込みを受け付けました。下記の銀行口座にお振込ください。
                </p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">銀行名</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{bankInfo.bankName}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfo.bankName)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">支店名</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{bankInfo.branch}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfo.branch)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">口座種別</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{bankInfo.accountType}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfo.accountType)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">口座番号</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium font-mono">{bankInfo.accountNumber}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfo.accountNumber)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">口座名義</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{bankInfo.accountHolder}</span>
                    <button
                      onClick={() => copyToClipboard(bankInfo.accountHolder)}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      <Icon name="copy" className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Icon name="alert-triangle" className="h-5 w-5 text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <p className="font-medium mb-1">重要</p>
                    <p>お振込の際は、必ずお客様のメールアドレスを振込依頼人名に入れてください。振込確認後、プレミアム機能が有効になります。</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowBankInfo(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}; 
