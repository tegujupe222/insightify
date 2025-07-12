import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

interface HeatmapData {
  x: number;
  y: number;
  count: number;
}

interface ElementAnalysis {
  elementSelector: string;
  elementText: string;
  count: number;
}

interface EnhancedHeatmapViewerProps {
  projectId: string;
  pageUrl: string;
  pageTitle?: string;
}

export const EnhancedHeatmapViewer: React.FC<EnhancedHeatmapViewerProps> = ({
  projectId,
  pageUrl,
  pageTitle
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [elementAnalysis, setElementAnalysis] = useState<ElementAnalysis[]>([]);
  const [heatmapType, setHeatmapType] = useState<'click' | 'scroll' | 'move'>('click');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showElementAnalysis, setShowElementAnalysis] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    fetchHeatmapData();
  }, [projectId, pageUrl, heatmapType, dateRange]);

  const fetchHeatmapData = async () => {
    try {
      setLoading(true);
      
      // Fetch aggregated heatmap data
      const response = await fetch(
        `/api/heatmap/projects/${projectId}/pages/${encodeURIComponent(pageUrl)}?type=${heatmapType}&aggregated=true`
      );
      const data = await response.json();
      
      if (data.success) {
        setHeatmapData(data.data);
      } else {
        setError('ヒートマップデータの取得に失敗しました');
      }
    } catch (err) {
      setError('ヒートマップデータの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchElementAnalysis = async () => {
    try {
      const response = await fetch(
        `/api/heatmap/projects/${projectId}/pages/${encodeURIComponent(pageUrl)}/elements?type=${heatmapType}`
      );
      const data = await response.json();
      
      if (data.success) {
        setElementAnalysis(data.data);
      }
    } catch (err) {
      console.error('Element analysis fetch error:', err);
    }
  };

  const drawHeatmap = () => {
    const canvas = canvasRef.current;
    if (!canvas || heatmapData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Find max count for normalization
    const maxCount = Math.max(...heatmapData.map(d => d.count));

    // Draw heatmap points
    heatmapData.forEach(point => {
      const intensity = point.count / maxCount;
      const radius = Math.max(5, Math.min(20, point.count / 10));
      
      // Create gradient
      const gradient = ctx.createRadialGradient(
        point.x, point.y, 0,
        point.x, point.y, radius
      );

      const colors = {
        click: { r: 255, g: 0, b: 0 },
        scroll: { r: 0, g: 255, b: 0 },
        move: { r: 0, g: 0, b: 255 }
      };

      const color = colors[heatmapType];
      
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.8})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  useEffect(() => {
    drawHeatmap();
  }, [heatmapData, heatmapType]);

  const handleElementAnalysisClick = () => {
    if (!showElementAnalysis) {
      fetchElementAnalysis();
    }
    setShowElementAnalysis(!showElementAnalysis);
  };

  const exportData = async () => {
    try {
      const response = await fetch(
        `/api/heatmap/projects/${projectId}/export?pageUrl=${encodeURIComponent(pageUrl)}&type=${heatmapType}`
      );
      const data = await response.json();
      
      if (data.success) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `heatmap-${pageUrl.replace(/[^a-zA-Z0-9]/g, '-')}-${heatmapType}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const getHeatmapTypeColor = (type: string) => {
    switch (type) {
      case 'click': return 'text-red-600 dark:text-red-400';
      case 'scroll': return 'text-green-600 dark:text-green-400';
      case 'move': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getHeatmapTypeIcon = (type: string) => {
    switch (type) {
      case 'click': return 'activity';
      case 'scroll': return 'trendingUp';
      case 'move': return 'globe';
      default: return 'map';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Icon name="map" className="w-5 h-5 mr-2" />
            ヒートマップビューアー
          </h3>
          {pageTitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pageTitle}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleElementAnalysisClick}
            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
          >
            <Icon name="activity" className="w-4 h-4 inline mr-1" />
            要素分析
          </button>
          <button
            onClick={exportData}
            className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            <Icon name="download" className="w-4 h-4 inline mr-1" />
            エクスポート
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ヒートマップタイプ:</label>
          <select
            value={heatmapType}
            onChange={(e) => setHeatmapType(e.target.value as any)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="click">クリック</option>
            <option value="scroll">スクロール</option>
            <option value="move">マウス移動</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">期間:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Heatmap Canvas */}
      <div className="relative mb-6">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900"
        />
        
        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-md">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name={getHeatmapTypeIcon(heatmapType)} className={`w-4 h-4 ${getHeatmapTypeColor(heatmapType)}`} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {heatmapType === 'click' ? 'クリック' : heatmapType === 'scroll' ? 'スクロール' : 'マウス移動'}
            </span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            データポイント: {heatmapData.length}
          </div>
        </div>
      </div>

      {/* Element Analysis */}
      {showElementAnalysis && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Icon name="activity" className="w-4 h-4 mr-2" />
            要素分析
          </h4>
          
          {elementAnalysis.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              要素分析データがありません
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {elementAnalysis.slice(0, 10).map((element, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {element.elementText || element.elementSelector}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {element.elementSelector}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400 ml-4">
                    {element.count.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Data Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {heatmapData.length.toLocaleString()}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400">データポイント</div>
        </div>
        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {heatmapData.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </div>
          <div className="text-xs text-green-600 dark:text-green-400">総アクション数</div>
        </div>
        <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
            {Math.max(...heatmapData.map(d => d.count)).toLocaleString()}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400">最大アクション数</div>
        </div>
      </div>
    </div>
  );
}; 