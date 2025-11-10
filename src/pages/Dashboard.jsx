import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { supabaseHelpers } from '../config/supabaseClient';
import { hasPermission } from '../utils/permissions';
import { useToast } from '../components/toast';
import ProfileSettings from '../components/ProfileSettings';
import './css/collaboration-cursor.css';
import { 
  LogOut, 
  Plus, 
  Grid3x3, 
  List, 
  Search,
  Filter,
  User, 
  ChevronDown,
  Grid,
  MoreVertical,  
  Trash2,        
  Clock,         
  ArrowRight,    
  FolderOpen,
  AlertCircle,
} from 'lucide-react';

function getRoleBadgeColor(role) {
  const colors = {
    owner: 'bg-violet-50 text-violet-700 border border-violet-200',
    admin: 'bg-blue-50 text-blue-700 border border-blue-200',
    editor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    viewer: 'bg-slate-50 text-slate-700 border border-slate-200'
  };
  return colors[role] || colors.viewer;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, signOut, loading: authLoading } = useAuthStore();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterRole, setFilterRole] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [avatarError, setAvatarError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const userMenuRef = useRef(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (profile?.id && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadProjects();
    }
  }, [profile?.id]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setAvatarError(false);
  }, [profile?.avatar_url]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📂 Loading projects for user:', profile.id);
      const startTime = performance.now();
      
      const data = await supabaseHelpers.getUserProjects(profile.id);
      
      const endTime = performance.now();
      console.log(`✅ Projects loaded in ${(endTime - startTime).toFixed(2)}ms`);
      
      setProjects(data || []);
    } catch (error) {
      console.error('❌ Error loading projects:', error);
      setError(error.message);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (project) => {
    // Check if user has permission to delete
    const canDelete = hasPermission(project.userRole, 'canDeleteProject');
    
    if (!canDelete) {
      toast.error(`Only project owners can delete projects. Your role: ${project.userRole}`);
      return;
    }

    try {
      // Optimistically remove from UI immediately
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setDeleteConfirm(null);
      
      // Show immediate feedback
      toast.success('Deleting project...');
      
      // Delete from database in the background
      await supabaseHelpers.deleteProject(project.id);
      
      // Update success message
      toast.success('Project deleted successfully');
    } catch (error) {
      console.error('Error deleting project:', error);
      
      // If delete failed, reload projects to restore UI
      toast.error(error.message || 'Failed to delete project');
      loadProjects();
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || project.userRole === filterRole;
    return matchesSearch && matchesRole;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!profile?.id) {
    navigate('/login', { replace: true });
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                hasLoadedRef.current = false;
                loadProjects();
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl font-bold">N</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NexFlow</h1>
                <p className="text-xs text-gray-500">Collaborative Workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-all"
                >
                  {profile?.avatar_url && !avatarError ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      onError={() => setAvatarError(true)}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center ring-2 ring-gray-200">
                      <span className="text-white text-sm font-semibold">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">
                      {profile?.full_name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                      {profile?.email}
                    </p>
                  </div>
                  
                  <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        {profile?.avatar_url && !avatarError ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.full_name}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200"
                            onError={() => setAvatarError(true)}
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center ring-2 ring-gray-200">
                            <span className="text-white text-lg font-semibold">
                              {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {profile?.full_name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {profile?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileSettings(true);
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 text-sm text-gray-700"
                    >
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>

                    <div className="border-t border-gray-100 my-1"></div>

                    <button
                      onClick={async () => {
                        try {
                          setSigningOut(true);
                          toast.success('Signing out...');
                          await signOut();
                          toast.success('Signed out successfully');
                          navigate('/login');
                        } catch (error) {
                          console.error('Sign out error:', error);
                          toast.error('Failed to sign out');
                          setSigningOut(false);
                        }
                      }}
                      disabled={signingOut}
                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-sm text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {signingOut ? (
                        <>
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          Signing out...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">My Projects</h1>
              <p className="text-gray-600">
                Manage and organize your collaborative workspaces
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">New Project</span>
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-white rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-sm"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="pl-9 pr-8 py-2 border border-gray-300 bg-white rounded-lg focus:ring-1 focus:ring-gray-900 outline-none appearance-none cursor-pointer transition-all text-sm font-medium text-gray-700"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="flex bg-white rounded-lg border border-gray-300 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${viewMode === 'list' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No projects found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery ? 'Try adjusting your search or filters' : 'Create your first project to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                navigate={navigate}
                onDelete={(project) => {
                  const canDelete = hasPermission(project.userRole, 'canDeleteProject');
                  if (!canDelete) {
                    toast.error(`Only project owners can delete projects. Your role: ${project.userRole}`);
                    return;
                  }
                  setDeleteConfirm(project);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {filteredProjects.map((project, index) => (
              <ProjectListItem
                key={project.id}
                project={project}
                navigate={navigate}
                isLast={index === filteredProjects.length - 1}
                onDelete={(project) => {
                  const canDelete = hasPermission(project.userRole, 'canDeleteProject');
                  if (!canDelete) {
                    toast.error(`Only project owners can delete projects. Your role: ${project.userRole}`);
                    return;
                  }
                  setDeleteConfirm(project);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(newProject) => {
            setProjects(prev => [newProject, ...prev]);
            setShowCreateModal(false);
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
          onConfirm={() => handleDeleteProject(deleteConfirm)}
          loading={loading}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, navigate, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/project/${project.id}`)}
      className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer relative"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl shadow-sm"
          style={{ backgroundColor: project.color + '20', color: project.color }}
        >
          {project.icon || '📁'}
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1.5 hover:bg-gray-100 rounded-lg transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(project);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                  canDelete 
                    ? 'text-red-600 hover:bg-red-50' 
                    : 'text-gray-400 cursor-not-allowed bg-gray-50'
                }`}
                disabled={!canDelete}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Project</span>
                {!canDelete && <AlertCircle className="w-3 h-3 ml-auto" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 mb-1 truncate">
          {project.name}
        </h3>
        <p className="text-sm text-gray-600 line-clamp-2">
          {project.description || 'No description'}
        </p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(project.userRole)}`}>
          {project.userRole}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className={`absolute bottom-5 right-5 transition-all duration-300 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}`}>
        <ArrowRight className="w-4 h-4 text-gray-400" />
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
      className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-all ${!isLast ? 'border-b border-gray-200' : ''}`}
    >
      <div
        onClick={() => navigate(`/project/${project.id}`)}
        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm flex-shrink-0"
          style={{ backgroundColor: project.color + '20', color: project.color }}
        >
          {project.icon || '📁'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate text-sm">{project.name}</h3>
          <p className="text-sm text-gray-600 truncate">{project.description || 'No description'}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getRoleBadgeColor(project.userRole)} hidden sm:block`}>
          {project.userRole}
        </span>
        <div className="flex items-center gap-1 text-xs text-gray-500 hidden md:flex">
          <Clock className="w-3 h-3" />
          {new Date(project.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
                onDelete(project);
              }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                canDelete 
                  ? 'text-red-600 hover:bg-red-50' 
                  : 'text-gray-400 cursor-not-allowed bg-gray-50'
              }`}
              disabled={!canDelete}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Project</span>
              {!canDelete && <AlertCircle className="w-3 h-3 ml-auto" />}
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
      const result = await supabaseHelpers.createProject(profile.id, formData);
      
      const newProject = {
        ...result,
        ...formData,
        userRole: 'owner',
        owner_id: profile.id,
        created_at: result.created_at || new Date().toISOString()
      };
      
      toast.success('Project created successfully');
      onSuccess(newProject);
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
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Project</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 bg-white rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all"
              placeholder="My Awesome Project"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 bg-white rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none resize-none transition-all"
              rows="3"
              placeholder="Brief description of the project..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex gap-2 flex-wrap">
              {icons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`w-11 h-11 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                    formData.icon === icon 
                      ? 'border-gray-900 bg-gray-50 scale-105' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-9 h-9 rounded-lg border-2 transition-all ${
                    formData.color === color 
                      ? 'border-gray-900 scale-105 ring-2 ring-gray-200' 
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
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 font-medium"
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
  const canDelete = hasPermission(project.userRole, 'canDeleteProject');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
      >
        {canDelete ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
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
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
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
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-amber-50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Permission Denied</h2>
                <p className="text-sm text-gray-500">You cannot delete this project</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You don't have permission to delete <strong className="text-gray-900">{project.name}</strong>.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-900 font-medium mb-2">
                      Your current role: <span className="font-bold">{project.userRole}</span>
                    </p>
                    <p className="text-sm text-amber-800">
                      Only <strong>owners</strong> can delete projects. Please contact the project owner if you need this project deleted.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Got It
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}