import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { supabase } from '../config/supabaseClient';
import { getEditorExtensions, editorProps } from '../components/editor/editorConfig';
import { useCollaboration } from '../utils/useCollaboration';
import { hasPermission } from '../utils/permissions';
import { debouncedProcessMentionNotifications } from '../utils/mentionNotifications';
import EditorToolbar from '../components/editor/EditorToolbar';
import EditorHeader from '../components/editor/EditorHeader';
import EditorPreview from '../components/editor/EditorPreview';
import VersionHistoryModal from '../components/editor/VersionHistoryModal';
import Breadcrumbs from '../components/editor/Breadcrumbs';
import { useToast } from "../components/toast";
import './css/collaboration-cursor.css';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

function CollaborativeEditor({ 
  doc, 
  mentionUsers, 
  canEdit, 
  onUpdate, 
  editorInstance, 
  cursorPositions, 
  broadcastCursor 
}) {
  const cursorRef = useRef(cursorPositions);
  
  useEffect(() => {
    cursorRef.current = cursorPositions;
  }, [cursorPositions]);

  const editor = useEditor({
    extensions: getEditorExtensions(doc, mentionUsers, {
      cursors: cursorRef.current,
      onCursorUpdate: broadcastCursor,
    }),
    editorProps,
    editable: canEdit,
    autofocus: canEdit,
    onUpdate: ({ editor }) => {
      if (canEdit) {
        onUpdate(editor.getHTML());
      }
    },
  }, [doc, mentionUsers, broadcastCursor]);

  useEffect(() => {
    if (!editor) return;
    
    const cursorsExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'customCursors'
    );
    
    if (cursorsExt) {
      cursorsExt.options.cursors = cursorPositions;
      const tr = editor.state.tr;
      editor.view.dispatch(tr);
    }
  }, [editor, cursorPositions]);

  useEffect(() => {
    if (editor && editorInstance) {
      editorInstance.current = editor;
    }
  }, [editor, editorInstance]);

  useEffect(() => {
    if (editor && editor.isEditable !== canEdit) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

export default function PageEditor() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [page, setPage] = useState(null);
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [versions, setVersions] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const userColor = useRef(getRandomColor());
  const saveTimeoutRef = useRef(null);
  const editorContentRef = useRef('');
  const editorRef = useRef(null);
  const initTimeoutRef = useRef(null);

  const { doc, activeUsers, cursorPositions, isReady: collabReady, broadcastCursor } = useCollaboration(
    pageId,
    currentUser
  );

  // Online status tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('You are back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('You are offline. Changes will sync when back online.');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const checkConnection = setInterval(() => {
      setIsOnline(navigator.onLine);
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkConnection);
    };
  }, [toast]);

  // Initialize
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        initTimeoutRef.current = setTimeout(() => {
          if (isMounted && isInitializing) {
            console.warn('⚠️ Initialization taking too long, forcing ready state');
            setIsInitializing(false);
          }
        }, 8000);

        const { data: { user } } = await supabase.auth.getUser();
        if (!isMounted) return;

        if (!user) {
          toast.error('Please login to access this page');
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!isMounted) return;

        if (profileError) {
          console.error('Profile error:', profileError);
          toast.error('Failed to load user profile');
          setIsInitializing(false);
          return;
        }

        setCurrentUser({ ...profile, color: userColor.current });

        // Load project name
        const { data: projectData } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        if (projectData) {
          setProjectName(projectData.name);
        }

        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('*')
          .eq('id', pageId)
          .single();

        if (!isMounted) return;

        if (pageError) {
          console.error('Page error:', pageError);
          toast.error('Failed to load page');
          setIsInitializing(false);
          return;
        }

        setPage(pageData);
        setTitle(pageData.title || 'Untitled Page');
        
        if (pageData.content) {
          editorContentRef.current = typeof pageData.content === 'string' 
            ? pageData.content 
            : (pageData.content.content || '');
        }

        const { data: roleData } = await supabase
          .from('project_members')
          .select('role')
          .eq('project_id', projectId)
          .eq('user_id', user.id)
          .single();

        if (!isMounted) return;

        setCurrentUserRole(roleData?.role || 'viewer');

        // Load project members with email for mentions
        const { data: members } = await supabase
          .from('project_members')
          .select(`
            user_id,
            profiles:user_id (
              id,
              full_name,
              email,
              avatar_url
            )
          `)
          .eq('project_id', projectId);

        if (!isMounted) return;

        const users = members?.map(m => ({
          id: m.profiles.id,
          label: m.profiles.full_name || m.profiles.email,
          email: m.profiles.email,
          avatar: m.profiles.avatar_url,
        })) || [];

        setMentionUsers(users);

        await Promise.all([
          loadBreadcrumbs(pageData),
          loadVersionHistory()
        ]);

        if (isMounted) {
          setIsInitializing(false);
          clearTimeout(initTimeoutRef.current);
        }

      } catch (error) {
        console.error('Init error:', error);
        if (isMounted) {
          toast.error('Failed to initialize editor');
          setIsInitializing(false);
        }
      }
    };

    if (pageId && projectId) {
      init();
    }

    return () => {
      isMounted = false;
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, [pageId, projectId, navigate, toast]);

  const loadBreadcrumbs = async (pageData) => {
    try {
      const crumbs = [];
      
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      crumbs.push({ 
        id: 'project', 
        title: project?.name || 'Project', 
        path: `/project/${projectId}` 
      });

      let currentPage = pageData;
      const parentPages = [];

      while (currentPage.parent_id) {
        const { data: parentPage } = await supabase
          .from('pages')
          .select('id, title, parent_id')
          .eq('id', currentPage.parent_id)
          .single();
        
        if (parentPage) {
          parentPages.unshift(parentPage);
          currentPage = parentPage;
        } else {
          break;
        }
      }

      parentPages.forEach(parent => {
        crumbs.push({
          id: parent.id,
          title: parent.title,
          path: `/project/${projectId}/page/${parent.id}`
        });
      });

      crumbs.push({ 
        id: 'page', 
        title: pageData.title || 'Untitled Page', 
        path: null 
      });

      setBreadcrumbs(crumbs);
    } catch (error) {
      console.error('Error loading breadcrumbs:', error);
    }
  };

  const loadVersionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('page_versions')
        .select(`
          *,
          profiles:created_by (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading versions:', error);
        return;
      }
      
      if (data) {
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleContentUpdate = (content) => {
    if (!hasPermission(currentUserRole, 'canEditPages')) return;

    const oldContent = editorContentRef.current;
    editorContentRef.current = content;

    // Process mention notifications with debounce
    if (currentUser && mentionUsers.length > 0 && projectName) {
      debouncedProcessMentionNotifications({
        oldContent,
        newContent: content,
        pageId,
        pageTitle: title,
        projectId,
        projectName,
        currentUser,
        mentionUsers,
        toast,
      }, 3000); // 3 second debounce
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaving(true);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('pages')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', pageId);

        if (error) throw error;
        
        setLastSaved(new Date());
      } catch (error) {
        console.error('Save error:', error);
        toast.error('Failed to save changes');
      } finally {
        setSaving(false);
      }
    }, 2000);
  };

  const handleTitleChange = async (newTitle) => {
    setTitle(newTitle);
    if (hasPermission(currentUserRole, 'canEditPages')) {
      try {
        await supabase
          .from('pages')
          .update({ 
            title: newTitle,
            updated_at: new Date().toISOString()
          })
          .eq('id', pageId);
      } catch (error) {
        console.error('Error updating title:', error);
        toast.error('Failed to update title');
      }
    }
  };

  const handleRestoreVersion = async (version) => {
    const confirmed = await toast.confirm({
      title: 'Restore Version',
      message: 'Restore this version? Current content will be saved as a new version.',
      confirmText: 'Restore',
      cancelText: 'Cancel',
      confirmVariant: 'primary'
    });

    if (!confirmed) return;

    try {
      if (!currentUser?.id) {
        toast.error('Unable to restore version');
        return;
      }

      if (!editorRef.current) {
        toast.error('Editor not ready');
        return;
      }

      const { data: maxVersion } = await supabase
        .from('page_versions')
        .select('version_number')
        .eq('page_id', pageId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const nextVersionNumber = (maxVersion?.version_number || 0) + 1;

      await supabase.from('page_versions').insert({
        page_id: pageId,
        title: title,
        content: editorContentRef.current,
        created_by: currentUser.id,
        version_number: nextVersionNumber
      });

      const restoredContent = typeof version.content === 'string' 
        ? version.content 
        : (version.content?.content || '');
      
      await supabase
        .from('pages')
        .update({
          content: restoredContent,
          title: version.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);
      
      if (editorRef.current) {
        editorRef.current.commands.setContent(restoredContent);
      }
      
      setTitle(version.title);
      editorContentRef.current = restoredContent;
      setShowVersionHistory(false);
      
      await loadVersionHistory();
      
      toast.success('Version restored successfully');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: shareUrl })
        .catch(() => {
          navigator.clipboard.writeText(shareUrl);
          toast.success('Link copied to clipboard!');
        });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const canEdit = hasPermission(currentUserRole, 'canEditPages');
  const isReady = !isInitializing && currentUser && collabReady && doc;

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 font-semibold text-lg mb-2">Loading Editor</p>
          <p className="text-gray-500 text-sm">
            {!currentUser ? 'Loading user data...' : 
             !collabReady ? 'Setting up collaboration...' : 
             'Almost ready...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <EditorHeader
        title={title}
        onTitleChange={handleTitleChange}
        saving={saving}
        lastSaved={lastSaved}
        activeUsers={activeUsers}
        currentUser={currentUser}
        onBack={() => navigate(`/project/${projectId}`)}
        onVersionHistory={() => setShowVersionHistory(true)}
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview(!showPreview)}
        isOnline={isOnline}
        onShare={handleShare}
        canEdit={canEdit}
      />

      <div className="bg-white border-b border-gray-200 px-6">
        <Breadcrumbs 
          items={breadcrumbs} 
          onNavigate={(path) => path && navigate(path)} 
        />
      </div>

      {!canEdit && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2">
          <p className="text-sm text-yellow-800">
            🔒 You are viewing this page in read-only mode
          </p>
        </div>
      )}

      {!isOnline && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-2">
          <p className="text-sm text-orange-800">
            📡 You are offline. Changes will sync when connection is restored.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200 bg-white transition-all duration-300`}>
          <CollaborativeEditor
            doc={doc}
            mentionUsers={mentionUsers}
            canEdit={canEdit}
            onUpdate={handleContentUpdate}
            editorInstance={editorRef}
            cursorPositions={cursorPositions}
            broadcastCursor={broadcastCursor}
          />
        </div>

        {showPreview && (
          <EditorPreview 
            title={title} 
            content={editorContentRef.current} 
          />
        )}
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          versions={versions}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
        />
      )}
    </div>
  );
}