import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';
import type { IconName } from './Icon';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  user: any;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentPage,
  onNavigate,
  onLogout,
  user
}) => {
  const { t } = useTranslation();
  const { theme, setTheme, isDark } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const navigationItems = [
    { key: 'dashboard', label: t('navigation.dashboard'), icon: 'dashboard' as IconName },
    { key: 'projects', label: t('navigation.projects'), icon: 'folder' as IconName },
    { key: 'analytics', label: t('navigation.analytics'), icon: 'barChart' as IconName },
    { key: 'realtime', label: t('navigation.realtime'), icon: 'activity' as IconName },
    { key: 'heatmap', label: t('navigation.heatmaps'), icon: 'map' as IconName },
    { key: 'reports', label: t('navigation.reports'), icon: 'fileText' as IconName },
  ];

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsSettingsOpen(false);
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    setIsSettingsOpen(false);
  };

  // サイドバーの幅
  const sidebarWidth = 'w-64';

  // サイドバーの内容を共通化
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* ロゴ */}
      <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-full shadow" />
          <span className="text-xl font-bold">Insightify</span>
        </div>
      </div>

      {/* メニュー */}
      <div className="flex-1 flex flex-col py-4 space-y-1">
        {navigationItems.map((item) => (
          <button
            key={item.key}
            onClick={() => {
              onNavigate(item.key);
              if (isMobile) setIsMobileMenuOpen(false);
            }}
            className={`flex items-center px-6 py-3 rounded-lg text-base font-medium transition-colors duration-200 space-x-3
              ${currentPage === item.key
                ? isDark
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-100 text-indigo-700'
                : isDark
                ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
          >
            <Icon name={item.icon} className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* 下部: ユーザー・設定・ログアウト */}
      <div className="px-6 pb-6 mt-auto">
        {/* テーマ切替 */}
        <button
          onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
          className={`w-full flex items-center px-3 py-2 mb-2 rounded-lg transition-colors duration-200 space-x-2
            ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          <Icon name={isDark ? 'sun' : 'moon'} className="w-5 h-5" />
          <span>{isDark ? t('settings.lightMode') : t('settings.darkMode')}</span>
        </button>

        {/* 言語・外観設定（モバイルでは省略） */}
        {!isMobile && (
          <div className="relative mb-2">
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-200 space-x-2
                ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
            >
              <Icon name="settings" className="w-5 h-5" />
              <span>{t('settings.title') || '設定'}</span>
            </button>
            {isSettingsOpen && (
              <div className={`absolute left-0 bottom-12 w-56 rounded-md shadow-lg py-1 z-50
                ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}
              >
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium">{t('settings.language')}</p>
                </div>
                <div className="px-4 py-2">
                  <button
                    onClick={() => handleLanguageChange('en')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >🇺🇸 English</button>
                  <button
                    onClick={() => handleLanguageChange('ja')}
                    className={`w-full text-left px-2 py-1 text-sm rounded ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >🇯🇵 日本語</button>
                </div>
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('settings.appearance')}</p>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${theme === 'light' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                  >
                    <Icon name="sun" className="w-4 h-4" />
                    <span>{t('settings.lightMode')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${theme === 'dark' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                  >
                    <Icon name="moon" className="w-4 h-4" />
                    <span>{t('settings.darkMode')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${theme === 'system' ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
                  >
                    <Icon name="monitor" className="w-4 h-4" />
                    <span>{t('settings.systemMode')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ユーザー情報 */}
        <div className="mb-2">
          <div className="text-sm">
            <p className="font-medium">{user?.name || 'User'}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email || 'user@example.com'}</p>
          </div>
        </div>

        {/* ログアウト */}
        <button
          onClick={onLogout}
          className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 space-x-2
            ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}`}
        >
          <Icon name="logout" className="w-5 h-5" />
          <span>{t('auth.logout')}</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* デスクトップ用: サイドバー本体 */}
      <nav
        className={`fixed top-0 left-0 h-screen z-40 flex flex-col ${sidebarWidth} transition-colors duration-200 hidden md:flex
          ${isDark ? 'bg-gray-900 border-r border-gray-700 text-white' : 'bg-white border-r border-gray-200 text-gray-900'}`}
      >
        <SidebarContent />
      </nav>

      {/* モバイル用: ハンバーガーメニュー */}
      <button
        className="fixed top-4 left-4 z-50 md:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg"
        onClick={() => setIsMobileMenuOpen((v) => !v)}
        aria-label="Open sidebar"
      >
        <Icon name={isMobileMenuOpen ? 'x' : 'menu'} className="w-6 h-6" />
      </button>

      {/* モバイル用: サイドバーオーバーレイ */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      {isMobileMenuOpen && (
        <nav
          className={`fixed top-0 left-0 h-screen z-50 flex flex-col ${sidebarWidth} transition-colors duration-200 md:hidden
            ${isDark ? 'bg-gray-900 border-r border-gray-700 text-white' : 'bg-white border-r border-gray-200 text-gray-900'}`}
        >
          <SidebarContent isMobile={true} />
        </nav>
      )}
    </>
  );
}; 