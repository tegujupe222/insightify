import React, { useState, useEffect } from 'react';
import { websocketService, LiveVisitor, PageView, RealTimeEvent } from '../services/websocket';
import { StatCard } from './StatCard';
import { Icon } from './Icon';

interface RealtimeDashboardProps {
  projectId: string;
  token: string;
}

export const RealtimeDashboard: React.FC<RealtimeDashboardProps> = ({ projectId, token }) => {
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitor[]>([]);
  const [recentPageViews, setRecentPageViews] = useState<PageView[]>([]);
  const [recentEvents, setRecentEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect(token, projectId);
    setIsConnected(websocketService.isConnected());

    // Listen for real-time updates
    const handlePageView = (pageView: PageView) => {
      setRecentPageViews(prev => [pageView, ...prev.slice(0, 9)]);
    };

    const handleEvent = (event: RealTimeEvent) => {
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]);
    };

    websocketService.on('pageview', handlePageView);
    websocketService.on('event', handleEvent);

    // Load initial data
    loadInitialData();

    // Poll for live visitor count every 30 seconds
    const interval = setInterval(loadInitialData, 30000);

    return () => {
      websocketService.off('pageview', handlePageView);
      websocketService.off('event', handleEvent);
      clearInterval(interval);
      websocketService.disconnect();
    };
  }, [projectId, token]);

  const loadInitialData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/realtime/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLiveVisitors(data.data.liveVisitors || []);
          setRecentPageViews(data.data.recentPageViews || []);
          setRecentEvents(data.data.recentEvents || []);
        }
      }
    } catch (error) {
      console.error('Error loading real-time data:', error);
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile')) return '📱';
    if (userAgent.includes('Tablet')) return '📱';
    return '💻';
  };

  const getBrowserIcon = (userAgent: string) => {
    if (userAgent.includes('Chrome')) return '🌐';
    if (userAgent.includes('Firefox')) return '🦊';
    if (userAgent.includes('Safari')) return '🍎';
    if (userAgent.includes('Edge')) return '🌐';
    return '🌐';
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 p-3 rounded-lg ${
        isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-sm font-medium">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Visitors"
          value={liveVisitors.length.toString()}
          change=""
          icon="👥"
          trend="+2"
          trendDirection="up"
        />
        <StatCard
          title="Page Views"
          value={recentPageViews.length.toString()}
          change=""
          icon="📄"
          trend="+5"
          trendDirection="up"
        />
        <StatCard
          title="Goals"
          value={recentEvents.length.toString()}
          change=""
          icon="🎯"
          trend="+3"
          trendDirection="up"
        />
      </div>

      {/* Live Visitors */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Icon name="users" className="w-5 h-5 mr-2" />
          Live Visitors ({liveVisitors.length})
        </h3>
        <div className="space-y-3">
          {liveVisitors.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No active visitors</p>
          ) : (
            liveVisitors.map((visitor) => (
              <div key={visitor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getDeviceIcon(visitor.userAgent)}</div>
                  <div>
                    <p className="font-medium text-sm">{visitor.page}</p>
                    <p className="text-xs text-gray-500">{visitor.userAgent}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatTime(visitor.lastActivity)}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Active</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Page Views */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icon name="fileText" className="w-5 h-5 mr-2" />
            Recent Page Views
          </h3>
          <div className="space-y-3">
            {recentPageViews.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent page views</p>
            ) : (
              recentPageViews.map((pageView) => (
                <div key={pageView.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">{getBrowserIcon(pageView.userAgent)}</div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-xs">{pageView.pageUrl}</p>
                      <p className="text-xs text-gray-500">{pageView.browser} • {pageView.os}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(pageView.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Icon name="activity" className="w-5 h-5 mr-2" />
            Recent Events
          </h3>
          <div className="space-y-3">
            {recentEvents.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent events</p>
            ) : (
              recentEvents.map((event) => (
                <div key={`${event.sessionId}-${event.timestamp}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">
                      {event.type === 'click' ? '🖱️' : event.type === 'scroll' ? '📜' : '🎯'}
                    </div>
                    <div>
                      <p className="font-medium text-sm capitalize">{event.type}</p>
                      <p className="text-xs text-gray-500">{event.page}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatTime(event.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 