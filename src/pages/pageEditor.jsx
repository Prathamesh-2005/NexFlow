import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useProjectStore } from '../stores/projectstore';
import { supabase } from '../config/supabaseClient';
import { 
  Save, 
  Clock, 
  Users, 
  ArrowLeft,
  Bold,
  Italic,
  Underline,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Table,
  AtSign,
  Minus,
  MoreVertical,
  Eye,
  History,
  Share2
} from 'lucide-react';

export default function PageEditor() {
  const { projectId, pageId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { currentProject, pages, updatePage } = useProjectStore();
  
  const [page, setPage] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  
  const editorRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const presenceChannelRef = useRef(null);

  useEffect(() => {
    const currentPage = pages.find(p => p.id === pageId);
    if (currentPage) {
      setPage(currentPage);
      setTitle(currentPage.title);
      setContent(currentPage.content || '');
    }
  }, [pageId, pages]);

  useEffect(() => {
    if (pageId && profile?.id) {
      setupPresence();
      loadVersionHistory();
    }

    return () => {
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
    };
  }, [pageId, profile?.id]);

  const setupPresence = () => {
    const channel = supabase.channel(`page:${pageId}:presence`, {
      config: {
        presence: {
          key: profile.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat().filter(u => u.user_id !== profile.id);
        setActiveUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            user_name: profile.full_name,
            avatar_url: profile.avatar_url,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = channel;
  };

  const loadVersionHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('page_versions')
        .select(`
          *,
          created_by_profile:profiles!created_by(full_name, avatar_url)
        `)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setVersions(data);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(newContent);
    }, 2000);
  };

  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave(content, newTitle);
    }, 1000);
  };

  const handleSave = async (contentToSave = content, titleToSave = title) => {
    try {
      setSaving(true);
      
      await updatePage(pageId, {
        content: contentToSave,
        title: titleToSave,
        updated_at: new Date().toISOString()
      });

      const shouldCreateVersion = Math.random() < 0.3;
      if (shouldCreateVersion) {
        await supabase.from('page_versions').insert({
          page_id: pageId,
          content: contentToSave,
          created_by: profile.id
        });
        await loadVersionHistory();
      }

      setLastSaved(new Date());
      setSaving(false);
    } catch (error) {
      console.error('Error saving page:', error);
      setSaving(false);
    }
  };

  const handleRestoreVersion = async (version) => {
    if (confirm('Restore this version? Current content will be saved as a new version.')) {
      try {
        await supabase.from('page_versions').insert({
          page_id: pageId,
          content: content,
          created_by: profile.id
        });

        setContent(version.content);
        await handleSave(version.content);
        setShowVersionHistory(false);
      } catch (error) {
        console.error('Error restoring version:', error);
      }
    }
  };

  const insertFormatting = (format) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = '';
    let cursorOffset = 0;

    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        cursorOffset = selectedText ? newText.length : 2;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'code':
        newText = `\`${selectedText}\``;
        cursorOffset = selectedText ? newText.length : 1;
        break;
      case 'h1':
        newText = `# ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'h2':
        newText = `## ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'h3':
        newText = `### ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'ul':
        newText = `- ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'ol':
        newText = `1. ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'checkbox':
        newText = `- [ ] ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'quote':
        newText = `> ${selectedText}`;
        cursorOffset = newText.length;
        break;
      case 'divider':
        newText = '\n---\n';
        cursorOffset = newText.length;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        cursorOffset = selectedText ? newText.length - 4 : 1;
        break;
      default:
        return;
    }

    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
    handleContentChange(newContent);

    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading page...</p>
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
        onBack={() => navigate(`/project/${projectId}`)}
        onVersionHistory={() => setShowVersionHistory(true)}
      />

      <EditorToolbar onFormat={insertFormatting} />

      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto py-8 px-6">
            <textarea
              ref={editorRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Start typing... Use markdown for formatting"
              className="w-full min-h-[600px] p-6 bg-white rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none font-mono text-sm leading-relaxed"
            />
          </div>
        </div>

        <div className="w-96 border-l border-gray-200 bg-white p-6 overflow-y-auto">
          <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
          <div className="prose prose-sm max-w-none">
            <MarkdownPreview content={content} />
          </div>
        </div>
      </div>

      {showVersionHistory && (
        <VersionHistoryModal
          versions={versions}
          onClose={() => setShowVersionHistory(false)}
          onRestore={handleRestoreVersion}
          currentContent={content}
        />
      )}
    </div>
  );
}

function EditorHeader({ title, onTitleChange, saving, lastSaved, activeUsers, onBack, onVersionHistory }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0"
            placeholder="Untitled Page"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {saving ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : lastSaved ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Save className="w-4 h-4 text-green-600" />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            ) : null}
          </div>

          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 3).map((user, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                    title={user.user_name}
                  >
                    {user.user_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                ))}
              </div>
              {activeUsers.length > 3 && (
                <span className="text-sm text-gray-600">+{activeUsers.length - 3}</span>
              )}
            </div>
          )}

          <button
            onClick={onVersionHistory}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <History className="w-4 h-4" />
            <span className="text-sm">History</span>
          </button>

          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Share2 className="w-4 h-4" />
            <span className="text-sm">Share</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function EditorToolbar({ onFormat }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2">
      <div className="flex items-center gap-1">
        <ToolbarButton icon={<Bold />} onClick={() => onFormat('bold')} title="Bold" />
        <ToolbarButton icon={<Italic />} onClick={() => onFormat('italic')} title="Italic" />
        <ToolbarButton icon={<Code />} onClick={() => onFormat('code')} title="Code" />
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <ToolbarButton icon={<Heading1 />} onClick={() => onFormat('h1')} title="Heading 1" />
        <ToolbarButton icon={<Heading2 />} onClick={() => onFormat('h2')} title="Heading 2" />
        <ToolbarButton icon={<Heading3 />} onClick={() => onFormat('h3')} title="Heading 3" />
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <ToolbarButton icon={<List />} onClick={() => onFormat('ul')} title="Bullet List" />
        <ToolbarButton icon={<ListOrdered />} onClick={() => onFormat('ol')} title="Numbered List" />
        <ToolbarButton icon={<CheckSquare />} onClick={() => onFormat('checkbox')} title="Checkbox" />
        
        <div className="w-px h-6 bg-gray-300 mx-2" />
        
        <ToolbarButton icon={<Quote />} onClick={() => onFormat('quote')} title="Quote" />
        <ToolbarButton icon={<LinkIcon />} onClick={() => onFormat('link')} title="Link" />
        <ToolbarButton icon={<Minus />} onClick={() => onFormat('divider')} title="Divider" />
      </div>
    </div>
  );
}

function ToolbarButton({ icon, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 text-gray-600 hover:bg-gray-100 rounded transition"
    >
      {React.cloneElement(icon, { className: 'w-4 h-4' })}
    </button>
  );
}

function MarkdownPreview({ content }) {
  const renderMarkdown = (text) => {
    let html = text;

    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>');

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');

    html = html.replace(/^\- \[ \] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" disabled class="rounded"> <span>$1</span></div>');
    html = html.replace(/^\- \[x\] (.*$)/gim, '<div class="flex items-center gap-2"><input type="checkbox" checked disabled class="rounded"> <span>$1</span></div>');
    html = html.replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>');
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>');

    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-700">$1</blockquote>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>');

    html = html.replace(/^---$/gim, '<hr class="my-4 border-gray-300">');

    html = html.split('\n').map(line => {
      if (line.trim() === '') return '<br>';
      if (line.match(/^<(h[1-3]|li|blockquote|hr|div)/)) return line;
      return `<p>${line}</p>`;
    }).join('\n');

    return html;
  };

  return (
    <div
      className="prose-content"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function VersionHistoryModal({ versions, onClose, onRestore, currentContent }) {
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] flex flex-col"
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Version History</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="w-80 border-r border-gray-200 overflow-y-auto">
            <div className="p-4 space-y-2">
              {versions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No version history</p>
              ) : (
                versions.map((version) => (
                  <button
                    key={version.id}
                    onClick={() => setSelectedVersion(version)}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedVersion?.id === version.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      By {version.created_by_profile?.full_name || 'Unknown'}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {selectedVersion ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Version Preview</h3>
                  <button
                    onClick={() => onRestore(selectedVersion)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Restore This Version
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                    {selectedVersion.content}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a version to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}