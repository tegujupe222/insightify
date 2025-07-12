import React from 'react';
import { Icon } from './Icon';
import type { AuthUser } from '../types';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  // Simulate login for admin
  const handleAdminLogin = () => {
    onLoginSuccess({ email: 'g-igasaki@shinko.ed.jp', role: 'admin' });
  };

  // Simulate login for a regular user
  const handleUserLogin = () => {
    onLoginSuccess({ email: 'demo-user@example.com', role: 'user' });
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-gray-900 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2">
           <Icon name="logo" className="h-10 w-10 text-indigo-400" />
           <h2 className="text-center text-3xl font-bold tracking-tight text-white">Insightify</h2>
        </div>
         <p className="mt-2 text-center text-sm text-gray-400">
          Analytics & User Behavior Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10 border border-gray-700">
           <div className="text-center mb-6">
            <h3 className="text-lg font-medium text-white">Sign In with Google</h3>
            <p className="text-sm text-gray-400 mt-1">Select a role to proceed</p>
          </div>
          
          <div className="space-y-4">
            <button
                type="button"
                onClick={handleAdminLogin}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                <Icon name="google" className="h-5 w-5" />
                Sign in as Admin
            </button>
            <div className="text-center text-xs text-gray-500">(g-igasaki@shinko.ed.jp)</div>
            
            <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                <span className="bg-gray-800 px-2 text-gray-400">Or</span>
                </div>
            </div>

            <button
                type="button"
                onClick={handleUserLogin}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
                <Icon name="google" className="h-5 w-5" />
                Sign in as User
            </button>
            <div className="text-center text-xs text-gray-500">(demo-user@example.com)</div>
          </div>

        </div>
      </div>
    </div>
  );
};
