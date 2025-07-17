import React, { useState } from 'react';
import type { Project } from '@/types';

interface TrackingCodeModalProps {
  project: Project;
  onClose: () => void;
}

export const TrackingCodeModal: React.FC<TrackingCodeModalProps> = ({ project, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'guide'>('code');

  const handleCopy = () => {
    navigator.clipboard.writeText(project.trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomainList = () => {
    const domains = project.domains || [];
    return [project.url, ...domains.filter((d: string) => d !== project.url)];
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Installation Guide</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'code'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Tracking Code
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-600'
              }`}
            >
              Setup Guide
            </button>
          </div>
        </div>

        {activeTab === 'code' ? (
          <div>
            <p className="text-gray-300 mb-4">
              Project "<span className="font-semibold text-indigo-400">{project.name}</span>" was created successfully. 
              Copy and paste the following snippet into the <code className="bg-gray-900 text-sm p-1 rounded-md text-red-400">&lt;head&gt;</code> section of your website.
            </p>
            
            {getDomainList().length > 1 && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
                <h4 className="text-blue-400 font-medium mb-2">Multiple Domains Detected</h4>
                <p className="text-blue-300 text-sm mb-2">This tracking code will work on the following domains:</p>
                <ul className="text-blue-300 text-sm space-y-1">
                  {getDomainList().map((domain, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-2" />
                      {domain}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="relative bg-gray-900 rounded-md p-4">
              <pre className="text-gray-300 text-sm overflow-x-auto">
                <code>{project.trackingCode}</code>
              </pre>
              <button 
                onClick={handleCopy} 
                className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1.5 rounded-md text-sm font-semibold flex items-center"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Step-by-Step Installation</h3>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Copy the Tracking Code</h4>
                    <p className="text-gray-400 text-sm">Copy the tracking code from the "Tracking Code" tab above.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Add to Your Website</h4>
                    <p className="text-gray-400 text-sm">Paste the code into the <code className="bg-gray-700 px-1 rounded text-sm">&lt;head&gt;</code> section of your HTML, just before the closing <code className="bg-gray-700 px-1 rounded text-sm">&lt;/head&gt;</code> tag.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="text-white font-medium">Verify Installation</h4>
                    <p className="text-gray-400 text-sm">Visit your website and check the dashboard to see if data is being collected. It may take a few minutes for the first data to appear.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Platform-Specific Instructions</h3>
              
              <div className="space-y-3">
                <div className="p-3 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-1">WordPress</h4>
                  <p className="text-gray-400 text-sm">Go to Appearance → Theme Editor → header.php and paste the code before &lt;/head&gt;</p>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-1">Shopify</h4>
                  <p className="text-gray-400 text-sm">Go to Online Store → Themes → Actions → Edit code → theme.liquid and paste the code in the &lt;head&gt; section</p>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-1">Wix</h4>
                  <p className="text-gray-400 text-sm">Go to Settings → Custom Code and add the code to the &lt;head&gt; section</p>
                </div>

                <div className="p-3 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-1">Custom HTML</h4>
                  <p className="text-gray-400 text-sm">Add the code directly to your HTML file's &lt;head&gt; section</p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <h4 className="text-yellow-400 font-medium mb-2">Important Notes</h4>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• The tracking code must be placed in the &lt;head&gt; section for best performance</li>
                <li>• Make sure the code is added to all pages you want to track</li>
                <li>• Clear your browser cache after installation</li>
                <li>• Data collection may take 5-10 minutes to appear in your dashboard</li>
              </ul>
            </div>
          </div>
        )}

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
