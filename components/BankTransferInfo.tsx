import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface BankTransferInfo {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  contactEmail: string;
}

export const BankTransferInfo: React.FC = () => {
  const [bankInfo, setBankInfo] = useState<BankTransferInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBankInfo = async() => {
      try {
        const response = await fetch('/api/subscriptions/bank-transfer-info');
        const data = await response.json();
        
        if (data.success) {
          setBankInfo(data.data);
        } else {
          setError('銀行振込情報の取得に失敗しました');
        }
      } catch (err) {
        setError('銀行振込情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchBankInfo();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // コピー成功のフィードバックを表示
      const button = document.activeElement as HTMLButtonElement;
      if (button) {
        const originalText = button.innerHTML;
        button.innerHTML = '<Icon name="check" className="w-4 h-4" /> コピー完了';
        button.disabled = true;
        setTimeout(() => {
          button.innerHTML = originalText;
          button.disabled = false;
        }, 2000);
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="text-red-500 text-center">
          <Icon name="alert-circle" className="w-6 h-6 mx-auto mb-2" />
          {error}
        </div>
      </div>
    );
  }

  if (!bankInfo) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Icon name="bank" className="w-5 h-5 mr-2" />
        銀行振込先口座情報
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">銀行名</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white">{bankInfo.bankName}</span>
                <button
                  onClick={() => copyToClipboard(bankInfo.bankName)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="コピー"
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">支店名</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white">{bankInfo.branchName}</span>
                <button
                  onClick={() => copyToClipboard(bankInfo.branchName)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="コピー"
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">口座種別</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white">{bankInfo.accountType}</span>
                <button
                  onClick={() => copyToClipboard(bankInfo.accountType)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="コピー"
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">口座番号</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white font-mono">{bankInfo.accountNumber}</span>
                <button
                  onClick={() => copyToClipboard(bankInfo.accountNumber)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="コピー"
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">口座名義</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-900 dark:text-white">{bankInfo.accountHolder}</span>
                <button
                  onClick={() => copyToClipboard(bankInfo.accountHolder)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="コピー"
                >
                  <Icon name="copy" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">お問い合わせ</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900 dark:text-white">{bankInfo.contactEmail}</span>
              <button
                onClick={() => copyToClipboard(bankInfo.contactEmail)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="コピー"
              >
                <Icon name="copy" className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Icon name="info" className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">振込時の注意事項</p>
              <ul className="space-y-1 text-xs">
                <li>• 振込手数料はお客様負担となります</li>
                <li>• 振込名義は必ずご登録のメールアドレスと同じにしてください</li>
                <li>• 振込完了後、お支払い確認まで1-2営業日かかります</li>
                <li>• ご不明な点がございましたら、お気軽にお問い合わせください</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 
