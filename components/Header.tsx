import React from 'react';
import { Icon } from './Icon';
import type { AuthUser } from '../types';

interface HeaderProps {
    onLogout: () => void;
    user: AuthUser;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  return (
    <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 flex items-center space-x-2">
              <Icon name="logo" className="h-8 w-8 text-indigo-400" />
              <span className="text-xl font-bold text-white">Insightify</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <div className="text-right">
                <p className="text-sm font-medium text-white">{user.email}</p>
                <p className={`text-xs font-semibold ${user.role === 'admin' ? 'text-amber-400' : 'text-sky-400'}`}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
            </div>
            {user.role === 'admin' && (
                <span className="text-amber-400" title="Administrator">
                    <Icon name="shield" className="h-6 w-6" />
                </span>
            )}
            <button
                onClick={onLogout}
                className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                aria-label="Logout"
            >
              <Icon name="logout" className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
