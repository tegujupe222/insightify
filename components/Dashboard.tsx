import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Navigation } from './Navigation';
import { StatCard } from './StatCard';
import { VisitorsChart } from './VisitorsChart';
import { DeviceChart } from './DeviceChart';
import { SourceTable } from './SourceTable';
import { LiveVisitors } from './LiveVisitors';
import { RealtimeDashboard } from './RealtimeDashboard';
import { SubscriptionUpgrade } from './SubscriptionUpgrade';
import { Icon } from './Icon';
import { useToast } from './Toast';
import type { AnalyticsData, Project, AuthUser } from '../types';
import { HeatmapPage } from './HeatmapPage';

interface DashboardProps {
    onLogout: () => void;
    project?: Project | null;
    onBackToProjects: () => void;
    user: AuthUser;
}

const Dashboard: React.FC<DashboardProps> = ({ onLogout, project, onBackToProjects, user }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Mock subscription data - replace with actual API call
  const [subscriptionData, setSubscriptionData] = useState<{
    currentPlan: 'free' | 'premium' | 'pending';
    monthlyPageViews: number;
    pageViewsLimit: number;
    subscriptionPlan: 'monthly' | 'yearly' | null;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!project?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('認証トークンが見つかりません');
        }

        const response = await fetch(`/api/analytics/${project.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('アナリティクスデータの取得に失敗しました');
        }

        const result = await response.json();
        console.log('Analytics API response:', result);
        if (result.success) {
          // APIレスポンスの構造に合わせて修正
          const analyticsData = result.data.analytics || result.data;
          setData(analyticsData);
        } else {
          throw new Error(result.error || 'アナリティクスデータの取得に失敗しました');
        }
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
        showToast({
          type: 'error',
          title: 'エラー',
          message: error instanceof Error ? error.message : 'アナリティクスデータの取得に失敗しました',
          duration: 5000
        });
        
        // エラー時はダミーデータを表示（フォールバック）
        setData({
          kpis: {
            pageViews: { value: '0', change: '0%' },
            uniqueUsers: { value: '0', change: '0%' },
            bounceRate: { value: '0%', change: '0%' },
          },
          liveVisitors: 0,
          visitorData: [],
          sources: [],
          deviceData: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project, showToast]);

  // サブスクリプション情報取得
  useEffect(() => {
    const fetchSubscription = async () => {
      setSubscriptionLoading(true);
      try {
        const token = localStorage.getItem('jwt');
        if (!token) throw new Error('認証トークンが見つかりません');
        const res = await fetch('/api/subscriptions/user', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error('サブスクリプション情報の取得に失敗しました');
        const result = await res.json();
        if (result.success) {
          setSubscriptionData({
            currentPlan: result.data.user.subscriptionStatus,
            monthlyPageViews: result.data.user.monthlyPageViews,
            pageViewsLimit: result.data.user.pageViewsLimit,
            subscriptionPlan: result.data.user.subscriptionPlan || null
          });
        } else {
          throw new Error(result.error || 'サブスクリプション情報の取得に失敗しました');
        }
      } catch (error) {
        showToast({
          type: 'error',
          title: 'エラー',
          message: error instanceof Error ? error.message : 'サブスクリプション情報の取得に失敗しました',
          duration: 5000
        });
        setSubscriptionData(null);
      } finally {
        setSubscriptionLoading(false);
      }
    };
    fetchSubscription();
  }, [user]);

  // サブスクリプションアップグレード
  const handleUpgrade = async (planType: 'monthly' | 'yearly') => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) throw new Error('認証トークンが見つかりません');
      const res = await fetch('/api/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ planType })
      });
      if (!res.ok) throw new Error('アップグレードリクエストの送信に失敗しました');
      const result = await res.json();
      if (result.success) {
        showToast({
          type: 'success',
          title: 'アップグレード申請',
          message: 'アップグレードリクエストが送信されました。管理者が確認後、プレミアム機能が有効になります。',
          duration: 5000
        });
        // ステータスをpendingに更新
        setSubscriptionData(prev => prev ? { ...prev, currentPlan: 'pending' } : prev);
      } else {
        throw new Error(result.error || 'アップグレードリクエストの送信に失敗しました');
      }
    } catch (error) {
      showToast({
        type: 'error',
        title: 'エラー',
        message: error instanceof Error ? error.message : 'アップグレードリクエストの送信に失敗しました',
        duration: 5000
      });
    }
  };

  if (loading || !data) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center space-x-3">
          <Icon name="loader" className="h-8 w-8 text-indigo-400" />
          <span className={`text-xl font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {t('common.loading')} {project?.name || 'Dashboard'}...
          </span>
        </div>
      </div>
    );
  }

  if (subscriptionLoading || !subscriptionData) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center space-x-3">
          <Icon name="loader" className="h-8 w-8 text-indigo-400" />
          <span className={`text-xl font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            サブスクリプション情報を取得中...
          </span>
        </div>
      </div>
    );
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  return (
    <div className={`min-h-screen font-sans ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
      <Navigation 
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        user={user}
      />
      <main className="pt-16 md:pt-16 md:ml-64 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
         <div className="mb-6">
            <button onClick={onBackToProjects} className={`flex items-center text-sm font-medium transition-colors duration-150 ${
              isDark ? 'text-gray-400 hover:text-indigo-400' : 'text-gray-600 hover:text-indigo-600'
            }`}>
                <Icon name="arrowLeft" className="h-4 w-4 mr-2" />
                {t('common.back')} {t('navigation.projects')}
            </button>
            <h1 className={`text-3xl font-bold mt-2 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{project?.name || 'Dashboard'}</h1>
            {project?.url && (
              <a href={project.url} target="_blank" rel="noopener noreferrer" className={`flex items-center mt-1 text-sm transition-colors duration-150 ${
                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'
              }`}>
                  <Icon name="globe" className="h-4 w-4 mr-1.5" />
                  {project.url}
              </a>
            )}
        </div>

        {/* Subscription Status */}
        <div className="mb-6">
          <SubscriptionUpgrade
            currentPlan={subscriptionData.currentPlan}
            monthlyPageViews={subscriptionData.monthlyPageViews}
            pageViewsLimit={subscriptionData.pageViewsLimit}
            onUpgrade={handleUpgrade}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <LiveVisitors initialCount={data.liveVisitors} />
          <StatCard title="Page Views" value={data.kpis.pageViews.value} change={data.kpis.pageViews.change} iconName="eye" />
          <StatCard title="Unique Users" value={data.kpis.uniqueUsers.value} change={data.kpis.uniqueUsers.change} iconName="users" />
          <StatCard title="Bounce Rate" value={data.kpis.bounceRate.value} change={data.kpis.bounceRate.change} iconName="trendingDown" changeColor="text-red-400" />
        </div>

        {/* Real-time Dashboard */}
        <div className="mb-6">
          <h2 className={`text-2xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('realtime.title')} {t('analytics.title')}
          </h2>
          <RealtimeDashboard projectId={project?.id || 'default'} token={user.token || ''} />
        </div>

        {/* Heatmap Analysis */}
        {currentPage === 'heatmap' && (
          <div className="mb-6">
            <HeatmapPage projectId={project?.id || 'default'} />
          </div>
        )}
        {currentPage === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-2 p-6 rounded-xl shadow-lg border ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
               <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                 {t('dashboard.visitorChart')}
               </h2>
              <VisitorsChart data={data.visitorData} />
            </div>
            <div className={`p-6 rounded-xl shadow-lg border ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
               <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                 {t('dashboard.trafficSources')}
               </h2>
              <SourceTable data={data.sources} />
            </div>
            <div className={`lg:col-span-3 p-6 rounded-xl shadow-lg border ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
               <h2 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                 {t('dashboard.deviceBreakdown')}
               </h2>
              <DeviceChart data={data.deviceData} />
            </div>
          </div>
        )}
      </main>
      <footer className={`text-center p-6 text-sm ${
        isDark ? 'text-gray-500' : 'text-gray-600'
      }`}>
        <p>Insightify Analytics Platform &copy; 2024</p>
      </footer>
    </div>
  );
};

export default Dashboard;