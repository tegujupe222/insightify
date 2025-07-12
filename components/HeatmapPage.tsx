import React, { useState } from 'react';
import { HeatmapPageManager } from './HeatmapPageManager';
import { EnhancedHeatmapViewer } from './EnhancedHeatmapViewer';
import { Icon } from './Icon';

interface HeatmapPageProps {
  projectId: string;
}

export const HeatmapPage: React.FC<HeatmapPageProps> = ({ projectId }) => {
  const [selectedPage, setSelectedPage] = useState<string | null>(null);
  const [selectedPageTitle, setSelectedPageTitle] = useState<string | null>(null);
  const [view, setView] = useState<'pages' | 'viewer'>('pages');

  const handlePageSelect = (pageUrl: string, pageTitle?: string) => {
    setSelectedPage(pageUrl);
    setSelectedPageTitle(pageTitle || null);
    setView('viewer');
  };

  const handleBackToPages = () => {
    setView('pages');
    setSelectedPage(null);
    setSelectedPageTitle(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Icon name="map" className="w-8 h-8 mr-3" />
                ヒートマップ分析
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                ユーザーの行動パターンを視覚的に分析し、ページの改善点を発見しましょう
              </p>
            </div>
            
            {view === 'viewer' && selectedPage && (
              <button
                onClick={handleBackToPages}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center"
              >
                <Icon name="arrowLeft" className="w-4 h-4 mr-2" />
                ページ一覧に戻る
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Page Manager */}
          <div className="lg:col-span-1">
            <HeatmapPageManager
              projectId={projectId}
              onPageSelect={handlePageSelect}
              selectedPage={selectedPage || undefined}
            />
          </div>

          {/* Main Content - Heatmap Viewer */}
          <div className="lg:col-span-2">
            {view === 'pages' ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                <Icon name="map" className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ヒートマップを表示するページを選択してください
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  左側のページ一覧から分析したいページをクリックして、ヒートマップを表示します。
                </p>
              </div>
            ) : selectedPage ? (
              <EnhancedHeatmapViewer
                projectId={projectId}
                pageUrl={selectedPage}
                pageTitle={selectedPageTitle || undefined}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                <Icon name="alert-circle" className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  ページが選択されていません
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  左側のページ一覧からページを選択してください。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            ヒートマップ機能の特徴
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Icon name="activity" className="w-8 h-8 text-red-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">クリック分析</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                ユーザーがどこをクリックしているかを視覚的に確認し、CTAボタンやリンクの効果を分析できます。
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Icon name="trendingUp" className="w-8 h-8 text-green-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">スクロール分析</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                ページのどの部分までユーザーがスクロールしているかを把握し、コンテンツの配置を最適化できます。
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <Icon name="globe" className="w-8 h-8 text-blue-500 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">マウス移動分析</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                ユーザーのマウス移動パターンを追跡し、ユーザーの視線の流れや興味のある領域を特定できます。
              </p>
            </div>
          </div>
        </div>

        {/* Usage Tips */}
        <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
            <Icon name="info" className="w-5 h-5 mr-2" />
            ヒートマップ活用のヒント
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <h4 className="font-medium mb-2">• データの蓄積</h4>
              <p>より正確な分析のため、十分なデータが蓄積されるまでお待ちください（推奨：100回以上のアクセス）</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• 期間の設定</h4>
              <p>特定の期間のデータを分析することで、キャンペーンや変更の効果を測定できます</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• 要素分析</h4>
              <p>要素分析機能を使用して、どの要素が最も注目されているかを詳細に確認できます</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">• データエクスポート</h4>
              <p>分析結果をJSON形式でエクスポートして、他のツールで活用できます</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 