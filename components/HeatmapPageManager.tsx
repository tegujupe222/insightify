import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';

interface HeatmapPage {
  id: string;
  projectId: string;
  pageUrl: string;
  pageTitle?: string;
  totalClicks: number;
  totalScrolls: number;
  totalMoves: number;
  lastActivity: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface HeatmapStats {
  totalPages: number;
  totalClicks: number;
  totalScrolls: number;
  totalMoves: number;
  mostActivePage: string | null;
}

interface HeatmapPageManagerProps {
  projectId: string;
  onPageSelect: (pageUrl: string) => void;
  selectedPage?: string;
}

export const HeatmapPageManager: React.FC<HeatmapPageManagerProps> = ({
  projectId,
  onPageSelect,
  selectedPage
}) => {
  const [pages, setPages] = useState<HeatmapPage[]>([]);
  const [stats, setStats] = useState<HeatmapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'clicks' | 'scrolls' | 'moves'>('all');
  const [sortBy, setSortBy] = useState<'activity' | 'clicks' | 'scrolls' | 'moves'>('activity');

  useEffect(() => {
    fetchPages();
    fetchStats();
  }, [projectId]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/heatmap/projects/${projectId}/pages`);
      const data = await response.json();
      
      if (data.success) {
        setPages(data.data);
      } else {
        setError('ページの取得に失敗しました');
      }
    } catch (err) {
      setError('ページの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/heatmap/projects/${projectId}/stats`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Stats fetch error:', err);
    }
  };

  const filteredAndSortedPages = pages
    .filter(page => {
      if (filter === 'all') return true;
      if (filter === 'clicks') return page.totalClicks > 0;
      if (filter === 'scrolls') return page.totalScrolls > 0;
      if (filter === 'moves') return page.totalMoves > 0;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'activity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        case 'clicks':
          return b.totalClicks - a.totalClicks;
        case 'scrolls':
          return b.totalScrolls - a.totalScrolls;
        case 'moves':
          return b.totalMoves - a.totalMoves;
        default:
          return 0;
      }
    });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPageTitle = (page: HeatmapPage) => {
    return page.pageTitle || page.pageUrl.split('/').pop() || page.pageUrl;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Icon name="map" className="w-5 h-5 mr-2" />
          ヒートマップページ管理
        </h3>
        {stats && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            総ページ数: {stats.totalPages}
          </div>
        )}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalClicks.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">総クリック数</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalScrolls.toLocaleString()}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">総スクロール数</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalMoves.toLocaleString()}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">総マウス移動数</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {stats.totalPages}
            </div>
            <div className="text-xs text-orange-600 dark:text-orange-400">ページ数</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">フィルター:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">すべて</option>
            <option value="clicks">クリックあり</option>
            <option value="scrolls">スクロールあり</option>
            <option value="moves">マウス移動あり</option>
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">並び順:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="activity">最終アクティビティ</option>
            <option value="clicks">クリック数</option>
            <option value="scrolls">スクロール数</option>
            <option value="moves">マウス移動数</option>
          </select>
        </div>
      </div>

      {/* Pages List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAndSortedPages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Icon name="map" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>ヒートマップデータがありません</p>
          </div>
        ) : (
          filteredAndSortedPages.map((page) => (
            <div
              key={page.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPage === page.pageUrl
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => onPageSelect(page.pageUrl)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                    {getPageTitle(page)}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {page.pageUrl}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="flex items-center">
                      <Icon name="activity" className="w-3 h-3 mr-1" />
                      {formatDate(page.lastActivity)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 ml-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {page.totalClicks.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">クリック</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">
                      {page.totalScrolls.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">スクロール</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {page.totalMoves.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">移動</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Most Active Page */}
      {stats?.mostActivePage && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center">
            <Icon name="trendingUp" className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              最もアクティブなページ: {stats.mostActivePage}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}; 