import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useProjectStore } from '../stores/projectstore';
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
  ArrowLeft
} from 'lucide-react';

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { 
    currentProject, 
    pages, 
    activities, 
    loading, 
    setCurrentProject,
    clearCurrentProject,
    createPage,
    updatePage,
    deletePage
  } = useProjectStore();

  const [showCreatePage, setShowCreatePage] = useState(false);
  const [selectedPage, setSelectedPage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showActivityFeed, setShowActivityFeed] = useState(true);

  useEffect(() => {
    if (projectId && profile?.id) {
      setCurrentProject(projectId, profile.id);
    }

    return () => {
      clearCurrentProject();
    };
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
      navigate(`/project/${projectId}/page/${newPage.id}`);
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Project not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <ProjectHeader project={currentProject} navigate={navigate} />
      
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
          onDeletePage={deletePage}
          onUpdatePage={updatePage}
        />

        <MainContent
          project={currentProject}
          pages={pages}
          projectId={projectId}
          navigate={navigate}
          onCreatePage={() => setShowCreatePage(true)}
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
    </div>
  );
}

function ProjectHeader({ project, navigate }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-2xl"
              style={{ backgroundColor: project.color + '20' }}
            >
              {project.icon || '📁'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-sm text-gray-600">{project.description}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Users className="w-4 h-4" />
            <span className="text-sm">Team</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>
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
  onUpdatePage
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
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <button
          onClick={onCreatePage}
          className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">New Page</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <button
            onClick={() => navigate(`/project/${projectId}`)}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Home className="w-4 h-4" />
            <span className="text-sm font-medium">Overview</span>
          </button>

          <button
            onClick={() => navigate(`/project/${projectId}/board/main`)}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <Layout className="w-4 h-4" />
            <span className="text-sm font-medium">Kanban Board</span>
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
            Pages
          </h3>
          <div className="space-y-1">
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
  level = 0
}) {
  const [showMenu, setShowMenu] = useState(false);
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

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
          selected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
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
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition"
          >
            <MoreVertical className="w-3 h-3" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  navigate(`/project/${projectId}/page/${page.id}`);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this page?')) {
                    onDelete(page.id);
                  }
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
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
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MainContent({ project, pages, projectId, navigate, onCreatePage }) {
  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to {project.name}</h2>
          <p className="text-gray-600">Organize your team's work in one collaborative workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div
            onClick={() => navigate(`/project/${projectId}/board/main`)}
            className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-500 hover:shadow-lg transition cursor-pointer group"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition">
              <Layout className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kanban Board</h3>
            <p className="text-sm text-gray-600">
              Manage tasks and track progress with drag-and-drop cards
            </p>
          </div>

          <div
            onClick={onCreatePage}
            className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-6 hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer group"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition">
              <Plus className="w-6 h-6 text-gray-600 group-hover:text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Create New Page</h3>
            <p className="text-sm text-gray-600">
              Start documenting with rich text editor
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Pages</h3>
          {pages.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No pages yet</p>
              <button
                onClick={onCreatePage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create First Page
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.slice(0, 5).map(page => (
                <div
                  key={page.id}
                  onClick={() => navigate(`/project/${projectId}/page/${page.id}`)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                >
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{page.title}</p>
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

function ActivityFeed({ activities, show, onToggle }) {
  if (!show) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-white border border-l-0 border-gray-200 rounded-l-lg p-2 hover:bg-gray-50 transition"
      >
        <Activity className="w-5 h-5 text-gray-600" />
      </button>
    );
  }

  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600" />
          <h2 className="font-semibold text-gray-900">Activity Feed</h2>
        </div>
        <button
          onClick={onToggle}
          className="p-1 hover:bg-gray-100 rounded transition"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600">No recent activity</p>
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

function ActivityItem({ activity }) {
  const getActionColor = (action) => {
    const colors = {
      created: 'text-green-600 bg-green-100',
      updated: 'text-blue-600 bg-blue-100',
      deleted: 'text-red-600 bg-red-100',
      moved: 'text-purple-600 bg-purple-100'
    };
    return colors[action] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActionColor(activity.action)}`}>
        <User className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          <span className="font-medium">{activity.user?.full_name || 'Someone'}</span>
          {' '}
          <span className="text-gray-600">{activity.action}</span>
          {' '}
          {activity.page && <span className="font-medium">{activity.page.title}</span>}
          {activity.card && <span className="font-medium">{activity.card.title}</span>}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(activity.created_at).toLocaleString()}
        </p>
      </div>
    </div>
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
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-40 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Page</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Enter page title..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}