import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => (
  <footer className="w-full py-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
    <div className="container mx-auto flex flex-col md:flex-row items-center justify-between px-4">
      <div className="mb-2 md:mb-0">&copy; {new Date().getFullYear()} IGA factory</div>
      <div className="space-x-4">
        <Link to="/privacy-policy" className="hover:underline">プライバシーポリシー</Link>
        <Link to="/cancel-policy" className="hover:underline">キャンセルポリシー</Link>
        <Link to="/terms" className="hover:underline">利用規約</Link>
      </div>
    </div>
  </footer>
); 