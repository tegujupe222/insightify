import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import type { Project, AuthUser } from '../types';
import { Navigation } from './Navigation';
import { Icon } from './Icon';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onAddNewProject: () => void;
  onLogout: () => void;
  user: AuthUser;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onAddNewProject, onLogout, user }) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-900'}`}>
      <Navigation 
        currentPage="projects"
        onNavigate={() => {}}
        onLogout={onLogout}
        user={user}
      />
      <main className="pt-16 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {t('projects.title')}
          </h1>
          <button 
            onClick={onAddNewProject} 
            className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150"
          >
            <Icon name="plus" className="h-5 w-5 mr-2" />
            {t('projects.addProject')}
          </button>
        </div>
        {projects.length === 0 ? (
          <div className={`text-center border-2 border-dashed rounded-lg p-12 mt-10 ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
          }`}>
            <Icon name="logo" className={`mx-auto h-12 w-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <h2 className={`mt-6 text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Welcome to Insightify!
            </h2>
            <p className={`mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {t('projects.createFirstProject')}
            </p>
            <button 
              onClick={onAddNewProject} 
              className="mt-6 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-150"
            >
              {t('projects.createProject')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map(project => (
              <div 
                key={project.id} 
                className={`rounded-lg border shadow-lg p-6 flex flex-col justify-between hover:border-indigo-500 hover:shadow-indigo-500/10 transition-all duration-150 group ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex-grow">
                  <h3 className={`text-xl font-bold truncate group-hover:text-indigo-400 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{project.name}</h3>
                  <p className={`mt-1 flex items-center text-sm break-all ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <Icon name="globe" className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{project.url}</span>
                  </p>
                </div>
                <button 
                  onClick={() => onSelectProject(project)} 
                  className={`mt-6 w-full font-semibold py-2 px-4 rounded-lg transition-colors duration-150 ${
                    isDark 
                      ? 'bg-gray-700 hover:bg-indigo-600 text-white' 
                      : 'bg-gray-100 hover:bg-indigo-600 hover:text-white text-gray-700'
                  }`}
                >
                  {t('common.view')} {t('common.dashboard')}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};