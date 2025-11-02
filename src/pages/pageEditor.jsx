import React, { useState, useEffect, useRef ,useCallback} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { supabase } from '../config/supabaseClient';
import { getEditorExtensions, editorProps } from '../components/editor/editorConfig';
import { useCollaboration } from '../utils/useCollaboration';
import { hasPermission } from '../utils/permissions';
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
  // Store cursor positions in a ref so it doesn't cause re-renders
  const cursorRef = useRef(cursorPositions);
  
  useEffect(() => {
    cursorRef.current = cursorPositions;
  }, [cursorPositions]);

  // Create editor WITHOUT cursorPositions in dependencies
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
  }, [doc, mentionUsers, broadcastCursor]); // NO cursorPositions here!

  // Manually update the extension when cursors change
  useEffect(() => {
    if (!editor) return;
    
    console.log('🔄 Updating cursor positions:', cursorPositions);
    
    const cursorsExt = editor.extensionManager.extensions.find(
      ext => ext.name === 'customCursors'
    );
    
    if (cursorsExt) {
      cursorsExt.options.cursors = cursorPositions;
      // Force decoration update
      const tr = editor.state.tr;
      editor.view.dispatch(tr);
    }
  }, [editor, cursorPositions]);

  // Pass editor instance to parent
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
      <EditorToolbar 
        editor={editor} 
      />
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
  
  const userColor = useRef(getRandomColor());
  const saveTimeoutRef = useRef(null);
  const editorContentRef = useRef('');
  const editorRef = useRef(null);

  const { doc, activeUsers, cursorPositions,isReady: collabReady ,broadcastCursor } = useCollaboration(
    pageId,
    currentUser
  );

  // Online status tracking
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (toast?.success) {
        toast.success('You are back online');
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      if (toast?.error) {
        toast.error('You are offline. Changes will sync when back online.');
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Check connection status periodically
    const checkConnection = setInterval(() => {
      setIsOnline(navigator.onLine);
    }, 5000);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(checkConnection);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast?.error('Please login to access this page');
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Profile error:', profileError);
          toast?.error('Failed to load user profile');
          return;
        }

        setCurrentUser(prev => {
  if (!prev || prev.id !== profile.id) {
    return { ...profile, color: userColor.current };
  }
  return prev;
});

        const { data: pageData, error: pageError } = await supabase
          .from('pages')
          .select('*')
          .eq('id', pageId)
          .single();

        if (pageError) {
          console.error('Page error:', pageError);
          toast?.error('Failed to load page');
          return;
        }

        setPage(pageData);
        setTitle(pageData.title || 'Untitled Page');
        
        // Store initial content
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

        setCurrentUserRole(roleData?.role || 'viewer');

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

        const users = members?.map(m => ({
          id: m.profiles.id,
          label: m.profiles.full_name || m.profiles.email,
          avatar: m.profiles.avatar_url,
        })) || [];

        setMentionUsers(users);
        console.log('✅ Loaded mention users:', users);

        // Load breadcrumbs
        await loadBreadcrumbs(pageData);
        
        // Load version history
        await loadVersionHistory();

      } catch (error) {
        console.error('Init error:', error);
        toast?.error('Failed to initialize editor');
      }
    };

    if (pageId && projectId) init();
  }, [pageId, projectId, navigate]);

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
        console.log('✅ Loaded versions:', data.length);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleContentUpdate = (content) => {
    if (!hasPermission(currentUserRole, 'canEditPages')) return;

    editorContentRef.current = content;

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
        console.log('💾 Saved');
      } catch (error) {
        console.error('Save error:', error);
        toast?.error('Failed to save changes');
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
        toast?.error('Failed to update title');
      }
    }
  };

  const handleRestoreVersion = async (version) => {
    if (!window.confirm('Restore this version? Current content will be saved as a new version.')) return;

    try {
      if (!currentUser?.id) {
        toast?.error('Unable to restore version');
        return;
      }

      if (!editorRef.current) {
        toast?.error('Editor not ready');
        return;
      }

      // Save current version first
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

      // Restore selected version
      const restoredContent = typeof version.content === 'string' 
        ? version.content 
        : (version.content?.content || '');
      
      // Update database
      await supabase
        .from('pages')
        .update({
          content: restoredContent,
          title: version.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pageId);
      
      // Update editor
      if (editorRef.current) {
        editorRef.current.commands.setContent(restoredContent);
      }
      
      setTitle(version.title);
      editorContentRef.current = restoredContent;
      setShowVersionHistory(false);
      
      // Reload version history
      await loadVersionHistory();
      
      toast?.success('Version restored successfully');
    } catch (error) {
      console.error('Error restoring version:', error);
      toast?.error('Failed to restore version');
    }
  };

  const handleImageUpload = async () => {
    if (!currentUser) {
      toast?.error("You must be logged in to upload images");
      return;
    }

    if (!editorRef.current) {
      toast?.error("Editor not ready");
      return;
    }
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        toast?.info?.('Uploading image...');
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${pageId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('page-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('page-images')
          .getPublicUrl(filePath);

        // Insert image into editor
        if (editorRef.current) {
          editorRef.current.chain().focus().setImage({ src: publicUrl }).run();
          toast?.success('Image uploaded successfully');
        }
      } catch (error) {
        console.error('Image upload failed:', error);
        toast?.error('Failed to upload image');
      }
    };
    input.click();
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({ title, url: shareUrl })
        .catch(() => {
          navigator.clipboard.writeText(shareUrl);
          toast?.success('Link copied to clipboard!');
        });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast?.success('Link copied to clipboard!');
    }
  };

  const canEdit = hasPermission(currentUserRole, 'canEditPages');

  if (!currentUser || !collabReady || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 font-semibold text-lg mb-2">Loading Editor</p>
          <p className="text-gray-500 text-sm">Setting up collaboration...</p>
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