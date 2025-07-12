import React from 'react';
import { Icon } from './Icon';
import type { AuthUser } from '../types';

interface LoginProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const Login: React.FC<LoginProps> = () => {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
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
            <p className="text-sm text-gray-400 mt-1">Use your Google account to sign in</p>
          </div>
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <Icon name="google" className="h-5 w-5" />
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
