import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown, File, Plus, MoreVertical } from 'lucide-react';
import { supabase } from '../../config/supabaseClient';



export default function PageNavigationTree({ projectId, currentPageId }) {
  const [pages, setPages] = useState([]);
  const [expandedPages, setExpandedPages] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      loadPages();
    }
  }, [projectId]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, parent_id, icon, position, is_archived')
        .eq('project_id', projectId)
        .eq('is_archived', false)
        .order('position', { ascending: true });

      if (error) throw error;

      setPages(data || []);
      
      // Auto-expand path to current page
      if (currentPageId) {
        expandPathToPage(currentPageId, data);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-expand all parents of current page
  const expandPathToPage = (pageId, pagesData) => {
    const page = pagesData.find(p => p.id === pageId);
    if (!page) return;

    const newExpanded = new Set(expandedPages);
    
    // Find all parents and expand them
    let currentParent = page.parent_id;
    while (currentParent) {
      newExpanded.add(currentParent);
      const parentPage = pagesData.find(p => p.id === currentParent);
      currentParent = parentPage?.parent_id;
    }

    setExpandedPages(newExpanded);
  };

  // Build tree structure from flat list
  const buildTree = (pages, parentId = null) => {
    return pages
      .filter(page => page.parent_id === parentId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  };

  const toggleExpand = (pageId) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const hasChildren = (pageId) => {
    return pages.some(page => page.parent_id === pageId);
  };

  const handlePageClick = (pageId) => {
    navigate(`/project/${projectId}/page/${pageId}`);
  };

  const handleAddSubpage = async (parentId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newPage, error } = await supabase
        .from('pages')
        .insert({
          project_id: projectId,
          parent_id: parentId,
          title: 'Untitled',
          content: { type: 'doc', content: [] },
          created_by: user.id,
          position: pages.filter(p => p.parent_id === parentId).length
        })
        .select()
        .single();

      if (error) throw error;

      // Expand parent and navigate to new page
      setExpandedPages(prev => new Set([...prev, parentId]));
      setPages(prev => [...prev, newPage]);
      navigate(`/project/${projectId}/page/${newPage.id}`);
    } catch (error) {
      console.error('Error creating subpage:', error);
    }
  };

  const renderPageItem = (page, depth = 0) => {
    const isExpanded = expandedPages.has(page.id);
    const isActive = page.id === currentPageId;
    const children = buildTree(pages, page.id);
    const hasChildPages = children.length > 0;

    return (
      <div key={page.id} className="select-none">
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer group ${
            isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(page.id);
            }}
            className={`p-0.5 hover:bg-gray-200 rounded ${
              !hasChildPages && 'invisible'
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Page Icon & Title */}
          <div
            onClick={() => handlePageClick(page.id)}
            className="flex items-center gap-2 flex-1 min-w-0"
          >
            <span className="text-sm">{page.icon || '📄'}</span>
            <span className="text-sm truncate flex-1">{page.title}</span>
          </div>

          {/* Actions Menu */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddSubpage(page.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Add subpage"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Show context menu (rename, delete, move, etc.)
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="More options"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Render children recursively */}
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderPageItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading pages...
      </div>
    );
  }

  const rootPages = buildTree(pages, null);

  return (
    <div className="py-2">
      <div className="px-2 mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Pages
        </h3>
        <button
          onClick={() => handleAddSubpage(null)}
          className="p-1 hover:bg-gray-200 rounded text-gray-600"
          title="Add root page"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-0.5">
        {rootPages.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500">
            No pages yet. Click + to create one.
          </div>
        ) : (
          rootPages.map(page => renderPageItem(page, 0))
        )}
      </div>
    </div>
  );
}
