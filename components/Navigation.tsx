import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';

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
    { key: 'dashboard', label: t('navigation.dashboard'), icon: 'dashboard' },
    { key: 'projects', label: t('navigation.projects'), icon: 'folder' },
    { key: 'analytics', label: t('navigation.analytics'), icon: 'barChart' },
    { key: 'realtime', label: t('navigation.realtime'), icon: 'activity' },
    { key: 'heatmap', label: t('navigation.heatmaps'), icon: 'map' },
    { key: 'reports', label: t('navigation.reports'), icon: 'fileText' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const toggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsSettingsOpen(false);
  };

  const handleLanguageChange = (language: string) => {
    // Change i18n language
    i18n.changeLanguage(language);
    setIsSettingsOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-900 border-gray-700 text-white' 
        : 'bg-white border-gray-200 text-gray-900'
    } border-b shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Icon name="analytics" className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Insightify</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navigationItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                    currentPage === item.key
                      ? isDark
                        ? 'bg-indigo-600 text-white'
                        : 'bg-indigo-100 text-indigo-700'
                      : isDark
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon name={item.icon} className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Right side - User menu and settings */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={() => handleThemeChange(isDark ? 'light' : 'dark')}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isDark
                  ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon name={isDark ? 'sun' : 'moon'} className="w-5 h-5" />
            </button>

            {/* Settings Dropdown */}
            <div className="relative">
              <button
                onClick={toggleSettings}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  isDark
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon name="settings" className="w-5 h-5" />
              </button>

              {isSettingsOpen && (
                <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                  isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}>
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium">{t('settings.appearance')}</p>
                  </div>
                  
                  {/* Theme Options */}
                  <div className="px-4 py-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('settings.language')}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleLanguageChange('en')}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        🇺🇸 English
                      </button>
                      <button
                        onClick={() => handleLanguageChange('ja')}
                        className={`w-full text-left px-2 py-1 text-sm rounded ${
                          isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        🇯🇵 日本語
                      </button>
                    </div>
                  </div>

                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('settings.appearance')}</p>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleThemeChange('light')}
                        className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${
                          theme === 'light' 
                            ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                      >
                        <Icon name="sun" className="w-4 h-4" />
                        <span>{t('settings.lightMode')}</span>
                      </button>
                      <button
                        onClick={() => handleThemeChange('dark')}
                        className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${
                          theme === 'dark' 
                            ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                      >
                        <Icon name="moon" className="w-4 h-4" />
                        <span>{t('settings.darkMode')}</span>
                      </button>
                      <button
                        onClick={() => handleThemeChange('system')}
                        className={`w-full text-left px-2 py-1 text-sm rounded flex items-center space-x-2 ${
                          theme === 'system' 
                            ? (isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700')
                            : (isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100')
                        }`}
                      >
                        <Icon name="monitor" className="w-4 h-4" />
                        <span>{t('settings.systemMode')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="hidden md:block">
              <div className="flex items-center space-x-3">
                <div className="text-sm">
                  <p className="font-medium">{user?.name || 'User'}</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email || 'user@example.com'}
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isDark
                      ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {t('auth.logout')}
                </button>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className={`p-2 rounded-md transition-colors duration-200 ${
                  isDark
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon name={isMobileMenuOpen ? 'x' : 'menu'} className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className={`md:hidden ${isDark ? 'bg-gray-900' : 'bg-white'} border-t border-gray-200 dark:border-gray-700`}>
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center space-x-3 ${
                  currentPage === item.key
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
            
            {/* Mobile user info and logout */}
            <div className="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.name || 'User'}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user?.email || 'user@example.com'}
                </p>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                  isDark
                    ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}; 