import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useProjectStore } from '../stores/projectstore';
import { supabase } from '../config/supabaseClient';
import { hasPermission } from '../utils/permissions';
import { useToast } from '../components/toast';
import ShareProjectModal from '../components/ShareProjectModal';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import { 
  FileText, 
  Plus, 
  ChevronRight, 
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Settings,
  Users,
  Layout,
  Activity,
  Search,
  X,
  Clock,
  User,
  Home,
  ArrowLeft,
  UserPlus,
  Shield
} from 'lucide-react';

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const toast = useToast();
  const { 
    currentProject, 
    pages, 
    activities, 
    loading, 
    setCurrentProject,
    clearCurrentProject,
    createPage,
    updatePage,
    deletePage,
    duplicatePage
  } = useProjectStore();

  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivityFeed, setShowActivityFeed] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentMemberRole, setCurrentMemberRole] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    if (projectId && profile?.id) {
      setCurrentProject(projectId, profile.id).catch(err => {
        if (isMounted) {
          toast.error('Failed to load project');
          console.error('Project load error:', err);
        }
      });
    }

    return () => {
      isMounted = false;
      clearCurrentProject();
    };
  }, [projectId, profile?.id, setCurrentProject, clearCurrentProject]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!projectId || !profile?.id) return;

      try {
        const { data, error } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', profile.id)
          .single();

        if (error) throw error;
        setCurrentMemberRole(data?.role || 'viewer');
      } catch (error) {
        console.error('Error fetching user role:', error);
        setCurrentMemberRole('viewer');
      }
    };

    fetchUserRole();
  }, [projectId, profile?.id]);

  const handleCreatePage = async (pageData) => {
    try {
      const newPage = await createPage({
        ...pageData,
        project_id: projectId,
        created_by: profile.id,
        content: '',
        position: pages.length
      });
      setShowCreatePage(false);
      toast.success('Page created successfully!');
      navigate(`/project/${projectId}/page/${newPage.id}`);
    } catch (error) {
      toast.error('Failed to create page');
      console.error('Error creating page:', error);
    }
  };

  const handleDuplicatePage = async (pageId) => {
    try {
      const duplicatedPage = await duplicatePage(pageId);
      toast.success('Page duplicated successfully!');
      navigate(`/project/${projectId}/page/${duplicatedPage.id}`);
    } catch (error) {
      toast.error('Failed to duplicate page');
      console.error('Error duplicating page:', error);
    }
  };

  const handleDeletePage = async (pageId, pageTitle) => {
    try {
      await deletePage(pageId);
      toast.success(`"${pageTitle}" deleted successfully`);
    } catch (error) {
      toast.error('Failed to delete page. Please try again.');
      console.error('Error deleting page:', error);
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Project not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <ProjectHeader 
        project={currentProject} 
        navigate={navigate}
        currentUserRole={currentMemberRole}
        onOpenShare={() => setShowShareModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          pages={filteredPages}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCreatePage={() => setShowCreatePage(true)}
          selectedPage={selectedPage}
          setSelectedPage={setSelectedPage}
          projectId={projectId}
          navigate={navigate}
          onDeletePage={handleDeletePage}
          onUpdatePage={updatePage}
          onDuplicatePage={handleDuplicatePage}
          currentUserRole={currentMemberRole}
        />

        <MainContent
          project={currentProject}
          pages={pages}
          projectId={projectId}
          navigate={navigate}
          onCreatePage={() => setShowCreatePage(true)}
          currentUserRole={currentMemberRole}
        />

        <ActivityFeed
          activities={activities}
          show={showActivityFeed}
          onToggle={() => setShowActivityFeed(!showActivityFeed)}
        />
      </div>

      {showCreatePage && (
        <CreatePageModal
          onClose={() => setShowCreatePage(false)}
          onCreate={handleCreatePage}
        />
      )}

      {showShareModal && (
        <ShareProjectModal
          project={currentProject}
          currentUserRole={currentMemberRole}
          currentUserId={profile.id}
          onClose={() => setShowShareModal(false)}
          onSuccess={() => {}}
        />
      )}

      {showSettingsModal && (
        <ProjectSettingsModal
          project={currentProject}
          currentUserRole={currentMemberRole}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={(updatedProject) => {}}
        />
      )}
    </div>
  );
}

function ProjectHeader({ project, navigate, currentUserRole, onOpenShare, onOpenSettings }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm"
              style={{ backgroundColor: project.color + '20', color: project.color }}
            >
              {project.icon || '📁'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
              <p className="text-xs text-gray-500">{project.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission(currentUserRole, 'canManageMembers') && (
            <button 
              onClick={onOpenShare}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Share</span>
            </button>
          )}
          {hasPermission(currentUserRole, 'canManageSettings') && (
            <button 
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Settings</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Sidebar({ 
  pages, 
  searchQuery, 
  setSearchQuery, 
  onCreatePage, 
  selectedPage, 
  setSelectedPage,
  projectId,
  navigate,
  onDeletePage,
  onUpdatePage,
  onDuplicatePage,
  currentUserRole
}) {
  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const toggleFolder = (pageId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const rootPages = pages.filter(p => !p.parent_id);

  return (
    <aside className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 bg-white rounded-lg text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
          />
        </div>

        {hasPermission(currentUserRole, 'canCreatePages') && (
          <button
            onClick={onCreatePage}
            className="w-full flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Page
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1 mb-4">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-lg transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            <span className="font-medium">Overview</span>
          </button>

          <button
            onClick={() => navigate(`/project/${projectId}/board/main`)}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-white rounded-lg transition-colors text-sm"
          >
            <Layout className="w-4 h-4" />
            <span className="font-medium">Kanban Board</span>
          </button>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            Pages
          </h3>
          <div className="space-y-0.5">
            {rootPages.map(page => (
              <PageTreeItem
                key={page.id}
                page={page}
                allPages={pages}
                expanded={expandedFolders.has(page.id)}
                onToggle={toggleFolder}
                selected={selectedPage?.id === page.id}
                onSelect={setSelectedPage}
                projectId={projectId}
                navigate={navigate}
                onDelete={onDeletePage}
                onUpdate={onUpdatePage}
                onDuplicate={onDuplicatePage}
                currentUserRole={currentUserRole}
              />
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

function PageTreeItem({ 
  page, 
  allPages, 
  expanded, 
  onToggle, 
  selected, 
  onSelect,
  projectId,
  navigate,
  onDelete,
  onUpdate,
  onDuplicate,
  currentUserRole,
  level = 0
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const menuRef = useRef(null);

  const children = allPages.filter(p => p.parent_id === page.id);
  const hasChildren = children.length > 0;

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowConfirmDialog(true);
  };

  const confirmDelete = () => {
    onDelete(page.id, page.title);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div>
        <div
          className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            selected ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-white'
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(page.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              {expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}

          <FileText className="w-4 h-4 flex-shrink-0" />
          
          <span
            onClick={() => {
              onSelect(page);
              navigate(`/project/${projectId}/page/${page.id}`);
            }}
            className="flex-1 text-sm truncate"
          >
            {page.title}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className={`p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all ${selected ? 'hover:bg-gray-800' : ''}`}
            >
              <MoreVertical className="w-3 h-3" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    navigate(`/project/${projectId}/page/${page.id}`);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                
                {hasPermission(currentUserRole, 'canCreatePages') && (
                  <button
                    onClick={async () => {
                      setShowMenu(false);
                      await onDuplicate(page.id);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                )}

                {hasPermission(currentUserRole, 'canDeletePages') && (
                  <>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={handleDeleteClick}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {expanded && hasChildren && (
          <div>
            {children.map(child => (
              <PageTreeItem
                key={child.id}
                page={child}
                allPages={allPages}
                expanded={expanded}
                onToggle={onToggle}
                selected={selected}
                onSelect={onSelect}
                projectId={projectId}
                navigate={navigate}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onDuplicate={onDuplicate}
                currentUserRole={currentUserRole}
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Page?</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{page.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MainContent({ project, pages, projectId, navigate, onCreatePage, currentUserRole }) {
  return (
    <main className="flex-1 overflow-y-auto p-8 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to {project.name}</h2>
          <p className="text-gray-600">Organize your team's work in one collaborative workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div
            onClick={() => navigate(`/project/${projectId}/board/main`)}
            className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-900 group-hover:text-white transition-colors">
              <Layout className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kanban Board</h3>
            <p className="text-sm text-gray-600">
              Manage tasks and track progress with drag-and-drop cards
            </p>
          </div>

          {hasPermission(currentUserRole, 'canCreatePages') && (
            <div
              onClick={onCreatePage}
              className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-gray-900 hover:bg-gray-100 transition-all cursor-pointer group"
            >
              <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-900 group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Page</h3>
              <p className="text-sm text-gray-600">
                Start documenting with rich text editor
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pages</h3>
          {pages.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No pages yet</p>
              {hasPermission(currentUserRole, 'canCreatePages') && (
                <button
                  onClick={onCreatePage}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                >
                  Create First Page
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pages.slice(0, 5).map(page => (
                <div
                  key={page.id}
                  onClick={() => navigate(`/project/${projectId}/page/${page.id}`)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">{page.title}</p>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(page.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ActivityItem({ activity }) {
  const getActivityMessage = () => {
    const userName = activity.user?.full_name || 'Someone';
    const metadata = activity.metadata || {};

    switch (metadata.action) {
      case 'member_added':
        return {
          icon: UserPlus,
          color: 'text-green-600 bg-green-50',
          message: `${userName} invited ${metadata.member_name || metadata.member_email} as ${metadata.role}`
        };
      
      case 'member_removed':
        return {
          icon: Trash2,
          color: 'text-red-600 bg-red-50',
          message: `${userName} removed ${metadata.member_name} from the project`
        };
      
      case 'role_changed':
        return {
          icon: Shield,
          color: 'text-blue-600 bg-blue-50',
          message: `${userName} changed a member's role to ${metadata.new_role}`
        };
      
      case 'page_duplicated':
        return {
          icon: Copy,
          color: 'text-purple-600 bg-purple-50',
          message: `${userName} duplicated "${metadata.original_title}"`
        };

      case 'card_created':
        return {
          icon: Plus,
          color: 'text-green-600 bg-green-50',
          message: `${userName} created card "${metadata.card_title}" in ${metadata.column_name}`
        };

      case 'card_updated':
        return {
          icon: Edit,
          color: 'text-blue-600 bg-blue-50',
          message: `${userName} updated card "${metadata.card_title}"`
        };

      case 'card_deleted':
        return {
          icon: Trash2,
          color: 'text-red-600 bg-red-50',
          message: `${userName} deleted card "${metadata.card_title}"`
        };

      case 'card_moved':
        return {
          icon: Layout,
          color: 'text-purple-600 bg-purple-50',
          message: `${userName} moved "${metadata.card_title}" from ${metadata.from_column} to ${metadata.to_column}`
        };

      case 'card_assigned':
        return {
          icon: User,
          color: 'text-blue-600 bg-blue-50',
          message: `${userName} assigned "${metadata.card_title}" to ${metadata.assignee_name}`
        };

      default:
        if (activity.activity_type === 'page_created') {
          return {
            icon: FileText,
            color: 'text-green-600 bg-green-50',
            message: `${userName} created page "${activity.page?.title || 'Untitled'}"`
          };
        } else if (activity.activity_type === 'page_updated') {
          return {
            icon: Edit,
            color: 'text-blue-600 bg-blue-50',
            message: `${userName} updated page "${activity.page?.title || 'Untitled'}"`
          };
        } else if (activity.activity_type === 'page_deleted') {
          return {
            icon: Trash2,
            color: 'text-red-600 bg-red-50',
            message: `${userName} deleted a page`
          };
        } else if (activity.activity_type === 'card_updated') {
          return {
            icon: Layout,
            color: 'text-blue-600 bg-blue-50',
            message: `${userName} updated a card`
          };
        }
        
        return {
          icon: Activity,
          color: 'text-gray-600 bg-gray-50',
          message: `${userName} performed an action`
        };
    }
  };

  const { icon: Icon, color, message } = getActivityMessage();

  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{message}</p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function ActivityFeed({ activities, show, onToggle }) {
  if (!show) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-white border border-l-0 border-gray-200 rounded-l-lg p-2 hover:bg-gray-50 transition-colors shadow-sm"
      >
        <Activity className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <aside className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Activity Feed</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}


function CreatePageModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await onCreate({ title: title.trim() });
    setLoading(false);
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create New Page</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
              placeholder="Enter page title..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}