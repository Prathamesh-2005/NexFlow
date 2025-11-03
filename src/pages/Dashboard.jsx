import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { supabaseHelpers } from '../config/supabaseClient';
import { hasPermission } from '../utils/permissions';
import { useToast } from '../components/toast';
import ProfileSettings from '../components/ProfileSettings';
import './css/collaboration-cursor.css';
import { 
  Plus, 
  FolderOpen, 
  Clock, 
  LogOut,
  Search,
  Filter,
  Grid,
  List,
  MoreVertical,
  Trash2,
  ChevronDown,
  User
} from 'lucide-react';

function getRoleBadgeColor(role) {
  const colors = {
    owner: 'bg-purple-100 text-purple-700 border border-purple-200',
    admin: 'bg-blue-100 text-blue-700 border border-blue-200',
    editor: 'bg-green-100 text-green-700 border border-green-200',
    viewer: 'bg-gray-100 text-gray-700 border border-gray-200'
  };
  return colors[role] || colors.viewer;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuthStore();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    if (profile?.id) {
      loadProjects();
    }
  }, [profile]); 

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await supabaseHelpers.getUserProjects(profile.id);
      setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      setLoading(true);
      await supabaseHelpers.deleteProject(projectId);
      setDeleteConfirm(null);
      toast.success('Project deleted successfully');
      await loadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || project.userRole === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <img 
                src="/logo.png" 
                alt="NexFlow Logo" 
                className="h-10 w-10 rounded-lg shadow-md object-cover"
              />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  NexFlow
                </h1>
                <p className="text-xs text-gray-600 font-medium">Collaborative Workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100/80 rounded-xl transition-all duration-200 border border-transparent hover:border-gray-200"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                    <span className="text-white text-sm font-semibold">
                      {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-600 truncate max-w-[140px]">
                      {profile?.email}
                    </p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden z-50 backdrop-blur-xl">
                    <div className="px-5 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white text-lg font-bold">
                            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {profile?.full_name || 'User'}
                          </p>
                          <p className="text-xs text-white/80 truncate">
                            {profile?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-2">
                      <button 
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowProfileSettings(true);
                        }}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 rounded-xl flex items-center gap-3 transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <span>Profile Settings</span>
                      </button>

                      <div className="my-2 border-t border-gray-200"></div>
                      
                      <button
                        onClick={signOut}
                        className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3 transition-all duration-200 group"
                      >
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center group-hover:bg-red-200 transition-colors">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-2">
            My Projects
          </h2>
          <p className="text-gray-700 text-lg">
            Manage and organize all your collaborative workspaces
          </p>
        </div>

        <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-10 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer transition-all shadow-sm font-medium text-gray-700"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex bg-gray-100 rounded-xl p-1.5 gap-1 shadow-sm">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-md' : 'hover:bg-gray-200'}`}
                >
                  <Grid className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-md' : 'hover:bg-gray-200'}`}
                >
                  <List className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 duration-200"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline font-semibold">New Project</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-700 font-semibold">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center shadow-lg">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <FolderOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              No projects found
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                navigate={navigate}
                onDelete={(project) => setDeleteConfirm(project)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            {filteredProjects.map((project, index) => (
              <ProjectListItem
                key={project.id}
                project={project}
                navigate={navigate}
                isLast={index === filteredProjects.length - 1}
                onDelete={(project) => setDeleteConfirm(project)}
              />
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProjects();
          }}
        />
      )}

      {showProfileSettings && (
        <ProfileSettings onClose={() => setShowProfileSettings(false)} />
      )}

      {deleteConfirm && (
        <DeleteConfirmModal
          project={deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => handleDeleteProject(deleteConfirm.id)}
          loading={loading}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, navigate, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const canDelete = hasPermission(project.userRole, 'canDeleteProject');

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-gray-200/50 p-6 hover:shadow-2xl hover:border-blue-300 hover:scale-105 transition-all duration-300 cursor-pointer relative overflow-hidden"
    >
      <div
        className="absolute top-0 left-0 right-0 h-2 rounded-t-2xl shadow-sm"
        style={{ backgroundColor: project.color }}
      ></div>

      <div className="absolute top-4 right-4" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded-lg transition-all duration-200"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>

        {showMenu && canDelete && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete(project);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>

      <div className="flex items-start gap-4 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg ring-2 ring-white"
          style={{ backgroundColor: project.color + '30' }}
        >
          {project.icon || '📁'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 truncate mb-1">
            {project.name}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {project.description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(project.userRole)}`}>
          {project.userRole}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function ProjectListItem({ project, navigate, isLast, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  const canDelete = hasPermission(project.userRole, 'canDeleteProject');

  return (
    <div
      className={`flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
      <div
        onClick={() => navigate(`/project/${project.id}`)}
        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-md ring-2 ring-white"
          style={{ backgroundColor: project.color + '30' }}
        >
          {project.icon || '📁'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{project.name}</h3>
          <p className="text-sm text-gray-600 truncate">{project.description}</p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getRoleBadgeColor(project.userRole)}`}>
          {project.userRole}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>

        {showMenu && canDelete && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete(project);
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateProjectModal({ onClose, onSuccess }) {
  const { profile } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📁',
    color: '#3B82F6'
  });

  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
    '#10B981', '#EF4444', '#6366F1', '#14B8A6'
  ];

  const icons = ['📁', '💼', '🚀', '⚡', '🎯', '🔥', '💡', '🎨'];

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    setLoading(true);

    try {
      await supabaseHelpers.createProject(profile.id, formData);
      toast.success('Project created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h2>

        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
              rows="3"
              placeholder="Brief description of the project..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex gap-2 flex-wrap">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`w-12 h-12 rounded-xl text-2xl flex items-center justify-center border-2 transition-all ${
                    formData.icon === icon 
                      ? 'border-blue-500 bg-blue-50 scale-110 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:scale-105'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-xl border-2 transition-all ${
                    formData.color === color 
                      ? 'border-gray-900 scale-110 shadow-lg ring-2 ring-gray-200' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 font-semibold shadow-lg"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ project, onClose, onConfirm, loading }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Delete Project</h2>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <strong className="text-gray-900">{project.name}</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800 font-medium mb-2">
              ⚠️ This will permanently delete:
            </p>
            <ul className="text-sm text-red-700 ml-4 space-y-1">
              <li>• All pages and content</li>
              <li>• All cards and tasks</li>
              <li>• All project data and history</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Project
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}