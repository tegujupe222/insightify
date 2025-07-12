import React, { useState } from 'react';

interface AddProjectModalProps {
  onAddProject: (name: string, url: string, domains?: string[]) => void;
  onClose: () => void;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({ onAddProject, onClose }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && url.trim()) {
      onAddProject(name, url, domains);
    }
  };

  const addDomain = () => {
    if (newDomain.trim() && !domains.includes(newDomain.trim())) {
      setDomains([...domains, newDomain.trim()]);
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setDomains(domains.filter(d => d !== domain));
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Add New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="projectName" className="block text-sm font-medium leading-6 text-gray-300">
              Project Name
            </label>
            <div className="mt-2">
              <input
                id="projectName"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Awesome Website"
                required
                className="block w-full rounded-md border-0 bg-gray-700 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          <div>
            <label htmlFor="projectUrl" className="block text-sm font-medium leading-6 text-gray-300">
              Main Website URL
            </label>
            <div className="mt-2">
              <input
                id="projectUrl"
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="block w-full rounded-md border-0 bg-gray-700 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-300">
              Additional Domains (Optional)
            </label>
            <div className="mt-2 flex space-x-2">
              <input
                type="url"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="https://subdomain.example.com"
                className="flex-1 rounded-md border-0 bg-gray-700 py-2 px-3 text-white shadow-sm ring-1 ring-inset ring-gray-600 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
              />
              <button
                type="button"
                onClick={addDomain}
                className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 text-sm"
              >
                Add
              </button>
            </div>
            {domains.length > 0 && (
              <div className="mt-2 space-y-1">
                {domains.map((domain, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                    <span className="text-gray-300 text-sm">{domain}</span>
                    <button
                      type="button"
                      onClick={() => removeDomain(domain)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-4 pt-4">
             <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-700 rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-500 disabled:opacity-50"
              disabled={!name.trim() || !url.trim()}
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 