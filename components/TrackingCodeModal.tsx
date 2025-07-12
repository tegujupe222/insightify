
import React, { useState } from 'react';
import type { Project } from '../types';
import { Icon } from './Icon';

interface TrackingCodeModalProps {
  project: Project;
  onClose: () => void;
}

export const TrackingCodeModal: React.FC<TrackingCodeModalProps> = ({ project, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(project.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Installation</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <Icon name="xMark" className="h-6 w-6" />
          </button>
        </div>
        <p className="text-gray-300 mb-4">Project "<span className="font-semibold text-indigo-400">{project.name}</span>" was created successfully. Copy and paste the following snippet into the <code className="bg-gray-900 text-sm p-1 rounded-md text-red-400">&lt;head&gt;</code> section of your website.</p>
        
        <div className="relative bg-gray-900 rounded-md p-4">
          <pre className="text-gray-300 text-sm overflow-x-auto">
            <code>{project.trackingCode}</code>
          </pre>
          <button onClick={handleCopy} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center">
            <Icon name="copy" className="h-4 w-4 mr-2" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
