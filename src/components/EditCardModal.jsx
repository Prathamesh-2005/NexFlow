import React, { useState, useRef } from 'react';
import { 
  X, 
  Bold, 
  Italic, 
  List, 
  ListOrdered,
  Link as LinkIcon,
  Code,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { useToast } from './toast';

export default function EditCardModal({ 
  card, 
  onClose, 
  onUpdate, 
  projectMembers, 
  projectLabels, 
  projectPages,
  projectId 
}) {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    priority: card.priority || 'medium',
    due_date: card.due_date || '',
    assignee_id: card.assignee_id || '',
    linked_page_id: card.linked_page_id || '',
    label_ids: card.labels?.map(l => l.id) || []
  });
  const [loading, setLoading] = useState(false);
  const [labels, setLabels] = useState(projectLabels);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate(card.id, formData);
    setLoading(false);
    onClose();
  };

  const toggleLabel = (labelId) => {
    setFormData(prev => ({
      ...prev,
      label_ids: prev.label_ids.includes(labelId)
        ? prev.label_ids.filter(id => id !== labelId)
        : [...prev.label_ids, labelId]
    }));
  };

  const insertFormatting = (before, after = '', placeholder = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.description;
    const selectedText = text.substring(start, end) || placeholder;

    const newText = 
      text.substring(0, start) + 
      before + 
      selectedText + 
      after + 
      text.substring(end);

    setFormData({ ...formData, description: newText });

    setTimeout(() => {
      textarea.focus();
      if (placeholder && !text.substring(start, end)) {
        const newStart = start + before.length;
        const newEnd = newStart + placeholder.length;
        textarea.setSelectionRange(newStart, newEnd);
      } else {
        const newCursorPos = start + before.length + selectedText.length + after.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const formatBold = () => insertFormatting('**', '**', 'bold text');
  const formatItalic = () => insertFormatting('*', '*', 'italic text');
  const formatCode = () => insertFormatting('`', '`', 'code');
  const formatLink = () => insertFormatting('[', '](https://example.com)', 'link text');
  
  const formatBulletList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = formData.description;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const currentLine = text.substring(lineStart, start);
    
    if (currentLine.trim() === '') {
      const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart);
      setFormData({ ...formData, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + 2, lineStart + 2);
      }, 0);
    } else {
      const newText = text.substring(0, lineStart) + '- ' + text.substring(lineStart);
      setFormData({ ...formData, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2);
      }, 0);
    }
  };

  const formatNumberedList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const text = formData.description;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const currentLine = text.substring(lineStart, start);
    
    if (currentLine.trim() === '') {
      const newText = text.substring(0, lineStart) + '1. ' + text.substring(lineStart);
      setFormData({ ...formData, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(lineStart + 3, lineStart + 3);
      }, 0);
    } else {
      const newText = text.substring(0, lineStart) + '1. ' + text.substring(lineStart);
      setFormData({ ...formData, description: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 3, start + 3);
      }, 0);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Edit Card</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none transition text-sm"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                >
                  {showPreview ? (
                    <>
                      <Edit className="w-4 h-4" />
                      Edit
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Preview
                    </>
                  )}
                </button>
              </div>
              
              {!showPreview ? (
                <>
                  <div className="flex items-center gap-1 p-2 bg-gray-50 border border-gray-300 rounded-t-lg border-b-0">
                    <button
                      type="button"
                      onClick={formatBold}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Bold"
                    >
                      <Bold className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={formatItalic}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Italic"
                    >
                      <Italic className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={formatCode}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Code"
                    >
                      <Code className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                    <button
                      type="button"
                      onClick={formatBulletList}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Bullet List"
                    >
                      <List className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={formatNumberedList}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Numbered List"
                    >
                      <ListOrdered className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={formatLink}
                      className="p-2 hover:bg-gray-200 rounded transition"
                      title="Link"
                    >
                      <LinkIcon className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-b-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none resize-none font-mono text-sm"
                    rows="10"
                    placeholder="Write your description here..."
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey) {
                        if (e.key === 'b') {
                          e.preventDefault();
                          formatBold();
                        } else if (e.key === 'i') {
                          e.preventDefault();
                          formatItalic();
                        }
                      }
                    }}
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Supports markdown: **bold**, *italic*, `code`, [link](url)
                  </p>
                </>
              ) : (
                <div className="min-h-[240px] p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  {formData.description ? (
                    <div className="prose prose-sm max-w-none">
                      <MarkdownPreview content={formData.description} />
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-sm">No description yet.</p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white transition text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignee
              </label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white transition text-sm"
              >
                <option value="">Unassigned</option>
                {projectMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name || member.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Page
              </label>
              <select
                value={formData.linked_page_id}
                onChange={(e) => setFormData({ ...formData, linked_page_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none bg-white transition text-sm"
              >
                <option value="">No linked page</option>
                {projectPages.map(page => (
                  <option key={page.id} value={page.id}>
                    {page.icon} {page.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Labels
                </label>
                <button
                  type="button"
                  onClick={() => setShowLabelManager(!showLabelManager)}
                  className="text-sm text-gray-700 hover:text-gray-900 flex items-center gap-1 font-medium"
                >
                  <Edit2 className="w-3 h-3" />
                  Manage Labels
                </button>
              </div>
              
              {labels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {labels.map(label => (
                    <button
                      key={label.id}
                      type="button"
                      onClick={() => toggleLabel(label.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                        formData.label_ids.includes(label.id)
                          ? 'ring-2 ring-offset-2 scale-105'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: `${label.color}20`,
                        color: label.color,
                        borderColor: `${label.color}40`,
                        ringColor: label.color
                      }}
                    >
                      {label.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No labels available</p>
              )}
            </div>

            {showLabelManager && (
              <LabelManager 
                projectId={projectId} 
                labels={labels}
                setLabels={setLabels}
                onClose={() => setShowLabelManager(false)}
              />
            )}

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function LabelManager({ projectId, labels, setLabels, onClose }) {
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3B82F6');
  const [editingLabel, setEditingLabel] = useState(null);
  const [deletingLabel, setDeletingLabel] = useState(null);
  const toast = useToast();

  const PRESET_COLORS = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#6B7280'
  ];

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('labels')
        .insert({
          project_id: projectId,
          name: newLabelName.trim(),
          color: newLabelColor
        })
        .select()
        .single();

      if (error) throw error;

      setLabels(prev => [...prev, data]);
      setNewLabelName('');
      toast.success('Label created successfully');
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('Failed to create label');
    }
  };

  const handleUpdateLabel = async (labelId, updates) => {
    try {
      const { error } = await supabase
        .from('labels')
        .update(updates)
        .eq('id', labelId);

      if (error) throw error;

      setLabels(prev => prev.map(l => l.id === labelId ? { ...l, ...updates } : l));
      setEditingLabel(null);
      toast.success('Label updated successfully');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    }
  };

  const handleDeleteLabel = async () => {
    if (!deletingLabel) return;

    try {
      const { error } = await supabase
        .from('labels')
        .delete()
        .eq('id', deletingLabel.id);

      if (error) throw error;

      setLabels(prev => prev.filter(l => l.id !== deletingLabel.id));
      toast.success('Label deleted successfully');
      setDeletingLabel(null);
    } catch (error) {
      console.error('Error deleting label:', error);
      toast.error('Failed to delete label');
      setDeletingLabel(null);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Manage Labels</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Create New Label</p>
          <div className="flex gap-2 items-start">
            <input
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateLabel();
                }
              }}
              placeholder="Label name..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-900 focus:border-gray-900 outline-none"
            />
            <button
              type="button"
              onClick={handleCreateLabel}
              disabled={!newLabelName.trim()}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm flex items-center gap-1 whitespace-nowrap font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="flex gap-1">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setNewLabelColor(color)}
                className={`w-8 h-8 rounded transition ${
                  newLabelColor === color ? 'ring-2 ring-offset-1 ring-gray-900 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {labels.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Existing Labels</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {labels.map(label => (
                <div key={label.id} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                  {editingLabel === label.id ? (
                    <input
                      type="text"
                      defaultValue={label.name}
                      onBlur={(e) => {
                        if (e.target.value.trim() !== label.name) {
                          handleUpdateLabel(label.id, { name: e.target.value.trim() });
                        } else {
                          setEditingLabel(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.target.blur();
                        } else if (e.key === 'Escape') {
                          setEditingLabel(null);
                        }
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 border border-gray-900 rounded text-sm focus:outline-none"
                    />
                  ) : (
                    <>
                      <div
                        className="w-4 h-4 rounded flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-sm">{label.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditingLabel(label.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Edit2 className="w-3 h-3 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingLabel(label)}
                        className="p-1 hover:bg-red-100 rounded"
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {deletingLabel && (
        <div
          onClick={() => setDeletingLabel(null)}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Label?</h3>
            <p className="text-sm text-gray-600 mb-1">
              Are you sure you want to delete <span className="font-semibold">"{deletingLabel.name}"</span>?
            </p>
            <p className="text-sm text-red-600 font-medium mb-6">
              It will be removed from all cards.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingLabel(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLabel}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Label
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MarkdownPreview({ content }) {
  const renderMarkdown = (text) => {
    if (!text) return '';
    
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline font-medium" target="_blank" rel="noopener noreferrer">$1</a>');
    
    const lines = text.split('\n');
    let inList = false;
    let listType = null;
    let processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const bulletMatch = line.match(/^-\s+(.+)/);
      const numberMatch = line.match(/^\d+\.\s+(.+)/);
      
      if (bulletMatch) {
        if (!inList || listType !== 'ul') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ul class="list-disc list-inside space-y-1 my-2">');
          inList = true;
          listType = 'ul';
        }
        processedLines.push(`<li class="ml-4">${bulletMatch[1]}</li>`);
      } else if (numberMatch) {
        if (!inList || listType !== 'ol') {
          if (inList) processedLines.push(`</${listType}>`);
          processedLines.push('<ol class="list-decimal list-inside space-y-1 my-2">');
          inList = true;
          listType = 'ol';
        }
        processedLines.push(`<li class="ml-4">${numberMatch[1]}</li>`);
      } else {
        if (inList) {
          processedLines.push(`</${listType}>`);
          inList = false;
          listType = null;
        }
        if (line.trim()) {
          processedLines.push(`<p class="mb-2">${line}</p>`);
        } else {
          processedLines.push('<br>');
        }
      }
    }
    
    if (inList) {
      processedLines.push(`</${listType}>`);
    }
    
    return processedLines.join('');
  };

  return (
    <div 
      className="markdown-preview text-sm text-gray-800 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}