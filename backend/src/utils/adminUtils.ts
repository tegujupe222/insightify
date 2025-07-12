// Admin utilities for managing subscriptions and user limits

const ADMIN_EMAILS = [
  'g-igasaki@shinko.ed.jp',
  'igafactory2023@gmail.com'
];

export const isAdminEmail = (email: string): boolean => {
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export const getSubscriptionPricing = () => {
  return {
    monthly: {
      price: 5500,
      currency: 'JPY',
      period: 'month'
    },
    yearly: {
      price: 55000, // 10% discount
      currency: 'JPY',
      period: 'year'
    }
  };
};

export const generateInvoiceNumber = (): string => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `INV-${timestamp}-${random}`;
};

export const calculatePageViewsLimit = (subscriptionStatus: string): number => {
  switch (subscriptionStatus) {
    case 'premium':
      return Infinity; // Unlimited for premium users
    case 'free':
    default:
      return 3000; // 3000 PV limit for free users
  }
};

export const checkPageViewsLimit = (currentViews: number, limit: number): boolean => {
  return currentViews < limit;
};

export const getEmailTemplates = () => {
  return {
    upgrade_recommended: {
      subject: '【Insightify】アップグレードをお勧めします',
      content: (userEmail: string, currentViews: number) => `
        ${userEmail} 様

        Insightifyをご利用いただき、ありがとうございます。

        現在のページビュー数が${currentViews}に達しており、無料プランの制限（3,000PV）に近づいています。

        より多くの機能をご利用いただくために、プレミアムプランへのアップグレードをお勧めします。

        【プレミアムプランの特典】
        • 無制限のページビュー
        • 全機能の利用
        • 優先サポート

        【料金】
        • 月額：¥5,500
        • 年額：¥55,000（10%割引）

        アップグレードをご希望の場合は、ダッシュボードからお申し込みください。

        --
        Insightify Team
      `
    },
    subscription_requested: {
      subject: '【Insightify】サブスクリプション申し込みを受け付けました',
      content: (userEmail: string, planType: string, amount: number, invoiceNumber: string) => `
        ${userEmail} 様

        Insightifyプレミアムプランのお申し込みを受け付けました。

        【申し込み内容】
        プラン：${planType === 'monthly' ? '月額' : '年額'}
        金額：¥${amount.toLocaleString()}
        請求書番号：${invoiceNumber}

        【お支払い方法】
        銀行振込にてお支払いください。
        振込先口座情報は別途お送りいたします。

        お支払い確認後、プレミアム機能が有効になります。

        --
        Insightify Team
      `
    },
    subscription_activated: {
      subject: '【Insightify】プレミアム機能が有効になりました',
      content: (userEmail: string) => `
        ${userEmail} 様

        お支払いの確認が完了し、プレミアム機能が有効になりました。

        【利用可能な機能】
        • 無制限のページビュー
        • 全機能の利用
        • 優先サポート

        引き続きInsightifyをご愛用ください。

        --
        Insightify Team
      `
    },
    payment_confirmed: {
      subject: '【Insightify】お支払い確認完了',
      content: (userEmail: string, planType: string) => `
        ${userEmail} 様

        ${planType === 'monthly' ? '月額' : '年額'}プランのお支払いを確認いたしました。

        プレミアム機能が有効になり、無制限でサービスをご利用いただけます。

        --
        Insightify Team
      `
    },
    limit_warning: {
      subject: '【Insightify】ページビュー制限に近づいています',
      content: (userEmail: string, currentViews: number, limit: number) => `
        ${userEmail} 様

        現在のページビュー数が${currentViews}に達しており、制限（${limit}PV）の${Math.round((currentViews / limit) * 100)}%に達しています。

        制限に達すると、新規データの収集が停止されます。

        継続してサービスをご利用いただくために、プレミアムプランへのアップグレードをご検討ください。

        --
        Insightify Team
      `
    }
  };
}; 