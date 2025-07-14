import React from 'react';

export const Login: React.FC = () => {
  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.png" alt="Logo" className="h-20 w-20 rounded-full shadow mb-2" />
          <span className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Insightify</span>
          <span className="text-sm text-gray-500 dark:text-gray-300 text-center">あなたのWebサイトを"見える化"する次世代アナリティクス</span>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow transition-colors duration-200"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
            <g>
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C36.68 2.36 30.7 0 24 0 14.82 0 6.71 5.08 2.69 12.44l7.98 6.2C12.13 13.13 17.62 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.02l7.19 5.6C43.93 37.13 46.1 31.3 46.1 24.55z"/>
              <path fill="#FBBC05" d="M9.67 28.64c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C-1.13 17.09-1.13 30.91 1.69 37.09l7.98-6.2z"/>
              <path fill="#EA4335" d="M24 46c6.7 0 12.68-2.36 17.04-6.45l-7.19-5.6c-2.01 1.35-4.6 2.15-7.85 2.15-6.38 0-11.87-3.63-14.33-8.94l-7.98 6.2C6.71 42.92 14.82 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </g>
          </svg>
          Googleでログイン
        </button>
      </div>
    </div>
  );
};
