import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './components/Dashboard';
import { Login } from './components/Login';
import { ProjectList } from './components/ProjectList';
import { AddProjectModal } from './components/AddProjectModal';
import { TrackingCodeModal } from './components/TrackingCodeModal';
import { AdminDashboard } from './components/AdminDashboard';
import type { Project, AuthUser } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [newlyCreatedProject, setNewlyCreatedProject] = useState<Project | null>(null); // To show tracking code

  const handleLoginSuccess = (user: AuthUser) => setCurrentUser(user);

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedProject(null);
    setProjects([]);
  };

  const handleAddProject = (name: string, url: string) => {
    const id = `proj_${Date.now()}`;
    const trackingCode = `<!-- Insightify Tracking Snippet for ${name} -->
<script async defer src="https://cdn.insightify.com/tracker.js" data-project-id="${id}"></script>`;
    const newProject = { id, name, url, trackingCode };
    setProjects(prev => [...prev, newProject]);
    setIsAddProjectModalOpen(false);
    setNewlyCreatedProject(newProject); // Trigger tracking code modal
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Admin or User view based on role
  if (currentUser.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }


  return (
    <ThemeProvider>
      <div className="bg-gray-900 min-h-screen">
        {selectedProject ? (
          <Dashboard 
            project={selectedProject} 
            onLogout={handleLogout} 
            onBackToProjects={handleBackToProjects}
            user={currentUser}
          />
        ) : (
          <ProjectList 
            projects={projects} 
            onSelectProject={handleSelectProject} 
            onAddNewProject={() => setIsAddProjectModalOpen(true)}
            onLogout={handleLogout}
            user={currentUser}
          />
        )}

        {isAddProjectModalOpen && (
          <AddProjectModal 
            onAddProject={handleAddProject} 
            onClose={() => setIsAddProjectModalOpen(false)} 
          />
        )}
        
        {newlyCreatedProject && (
          <TrackingCodeModal 
            project={newlyCreatedProject} 
            onClose={() => setNewlyCreatedProject(null)} 
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;