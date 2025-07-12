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
import { getMockAnalyticsData } from '../services/mockData';
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
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // Mock subscription data - replace with actual API call
  const [subscriptionData, setSubscriptionData] = useState({
    currentPlan: 'free' as 'free' | 'premium' | 'pending',
    monthlyPageViews: 2500,
    pageViewsLimit: 3000
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // In a real app, you would fetch data for project.id
        const result = await getMockAnalyticsData();
        setData(result);
      } catch (error) {
        console.error("Failed to fetch analytics data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [project]);

  const handleUpgrade = (planType: 'monthly' | 'yearly') => {
    // Mock implementation - replace with actual API call
    console.log('Upgrading to:', planType);
    setSubscriptionData(prev => ({
      ...prev,
      currentPlan: 'pending'
    }));
    
    // Simulate API call
    setTimeout(() => {
      alert('アップグレードリクエストが送信されました。管理者が確認後、プレミアム機能が有効になります。');
    }, 1000);
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
      <main className="pt-16 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto">
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