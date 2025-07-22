import React, { useState, useEffect } from 'react';
import type { Project } from '@/types';

interface ProjectSettingsModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedProject: Project) => void;
  onDelete: (projectId: string) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  project,
  isOpen,
  onClose,
  onUpdate,
  onDelete
}) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    domains: [] as string[]
  });
  const [newDomain, setNewDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        url: project.url || '',
        domains: project.domains || []
      });
    }
  }, [project]);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update project');

      const data = await response.json();
      onUpdate(data.data.project);
      onClose();
    } catch (err) {
      setError('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async() => {
    if (!project) return;
    
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token');

      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete project');

      onDelete(project.id);
      onClose();
    } catch (err) {
      setError('Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const addDomain = () => {
    if (newDomain.trim() && !formData.domains.includes(newDomain.trim())) {
      setFormData(prev => ({
        ...prev,
        domains: [...prev.domains, newDomain.trim()]
      }));
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      domains: prev.domains.filter(d => d !== domain)
    }));
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Project Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Main URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Additional Domains
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="url"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="https://subdomain.example.com"
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={addDomain}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
            <div className="space-y-2">
              {formData.domains.map((domain, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                  <span className="text-gray-300 text-sm">{domain}</span>
                  <button
                    type="button"
                    onClick={() => removeDomain(domain)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Delete Project
            </button>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}; 
