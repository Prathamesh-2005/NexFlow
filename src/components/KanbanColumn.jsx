import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  MoreVertical, 
  Calendar,
  Edit,
  Trash2,
  FileText,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';

// Simple Markdown renderer for card descriptions
function MarkdownText({ content }) {
  if (!content) return null;
  
  const renderMarkdown = (text) => {
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
    // Italic
    text = text.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
    // Inline code
    text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-xs font-mono">$1</code>');
    // Links
    text = text.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
    
    return text;
  };

  return (
    <span 
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

export default function KanbanColumn({ 
  column, 
  isDraggedOver, 
  onDragOver, 
  onDragLeave, 
  onDrop, 
  onDragStart, 
  onCreateCard, 
  onEditCard, 
  onDeleteCard,
  onUpdateCard,
  onDeleteColumn
}) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showDeleteColumnConfirm, setShowDeleteColumnConfirm] = useState(false);
  const columnMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteColumnClick = () => {
    setShowColumnMenu(false);
    setShowDeleteColumnConfirm(true);
  };

  const confirmDeleteColumn = () => {
    onDeleteColumn(column.id);
    setShowDeleteColumnConfirm(false);
  };

  return (
    <>
      <div
        className={`flex-shrink-0 w-80 bg-gray-100 rounded-xl p-4 flex flex-col transition-colors ${
          isDraggedOver ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: column.color }}
            />
            <h3 className="font-semibold text-gray-900">{column.name}</h3>
            <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full">
              {column.cards?.length || 0}
            </span>
          </div>
          
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={handleDeleteColumnClick}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Column
                </button>
              </div>
            )}
          </div>
        </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {(column.cards || []).map((card) => (
          <Card
            key={card.id}
            card={card}
            columnId={column.id}
            onDragStart={onDragStart}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
            onUpdate={onUpdateCard}
          />
        ))}
      </div>

      <button
        onClick={onCreateCard}
        className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition font-medium"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add Card</span>
      </button>
    </div>

    {/* Delete Column Confirmation Modal */}
    {showDeleteColumnConfirm && (
      <div
        onClick={() => setShowDeleteColumnConfirm(false)}
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Column?</h3>
              <p className="text-sm text-gray-600 mb-1">
                Are you sure you want to delete <span className="font-semibold">"{column.name}"</span>?
              </p>
              {column.cards?.length > 0 && (
                <p className="text-sm text-red-600 font-medium mt-2">
                  This will also delete {column.cards.length} card(s) in this column.
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteColumnConfirm(false)}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteColumn}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
            >
              Delete Column
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}

function Card({ card, columnId, onDragStart, onEdit, onDelete, onUpdate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(card.description || '');
  const menuRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionTextareaRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDescription && descriptionTextareaRef.current) {
      descriptionTextareaRef.current.focus();
    }
  }, [isEditingDescription]);

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== card.title) {
      await onUpdate(card.id, { title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(card.title);
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleTitleCancel();
    }
  };

  const handleDescriptionSave = async () => {
    if (editedDescription !== card.description) {
      await onUpdate(card.id, { description: editedDescription });
    }
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditedDescription(card.description || '');
      setIsEditingDescription(false);
    }
    // Allow Ctrl/Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleDescriptionSave();
    }
  };

  const handleDeleteClick = () => {
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete(card.id);
    setShowDeleteConfirm(false);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-700 border-green-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <>
      <div
        draggable={!isEditingTitle && !isEditingDescription}
        onDragStart={(e) => onDragStart(e, card, columnId)}
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-all group relative"
      >
        <div className="flex items-start justify-between mb-3">
          {isEditingTitle ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                ref={titleInputRef}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="flex-1 font-medium text-gray-900 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <h4 
              className="font-medium text-gray-900 flex-1 pr-2 cursor-text hover:bg-gray-50 px-2 py-1 rounded -mx-2 -my-1"
              onClick={() => setIsEditingTitle(true)}
            >
              {card.title}
            </h4>
          )}
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    onEdit(card);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Details
                </button>
                <button 
                  onClick={handleDeleteClick}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Card
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description - Inline Editing with Markdown */}
        {isEditingDescription ? (
          <div className="mb-3">
            <textarea
              ref={descriptionTextareaRef}
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              onKeyDown={handleDescriptionKeyDown}
              className="w-full text-sm text-gray-600 px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
              rows="4"
              placeholder="Add a description... (Markdown supported: **bold**, *italic*, `code`)"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleDescriptionSave}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={() => {
                  setEditedDescription(card.description || '');
                  setIsEditingDescription(false);
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
              <span className="text-xs text-gray-500">Ctrl+Enter to save</span>
            </div>
          </div>
        ) : (
          <>
            {card.description ? (
              <div 
                className="text-sm text-gray-600 mb-3 line-clamp-3 cursor-text hover:bg-gray-50 px-2 py-1 rounded -mx-2"
                onClick={() => setIsEditingDescription(true)}
              >
                <MarkdownText content={card.description} />
              </div>
            ) : (
              <p 
                className="text-sm text-gray-400 mb-3 cursor-text hover:bg-gray-50 px-2 py-1 rounded -mx-2 italic"
                onClick={() => setIsEditingDescription(true)}
              >
                Add description...
              </p>
            )}
          </>
        )}

        {/* Labels */}
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {card.labels.map((label) => (
              <span
                key={label.id}
                className="px-2 py-1 rounded text-xs font-medium border"
                style={{ 
                  backgroundColor: `${label.color}20`,
                  color: label.color,
                  borderColor: `${label.color}40`
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Linked Page */}
        {card.linked_page && (
          <div className="flex items-center gap-1 text-xs text-blue-600 mb-3 bg-blue-50 px-2 py-1.5 rounded border border-blue-100">
            <FileText className="w-3 h-3" />
            <span>{card.linked_page.icon}</span>
            <span className="truncate font-medium">{card.linked_page.title}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {card.priority && (
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(card.priority)}`}>
                {card.priority}
              </span>
            )}
            
            {card.due_date && (
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Calendar className="w-3 h-3" />
                {new Date(card.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </div>
            )}
          </div>

          {card.assignee && (
            <div className="flex-shrink-0" title={card.assignee.full_name}>
              {card.assignee.avatar_url ? (
                <img
                  src={card.assignee.avatar_url}
                  alt={card.assignee.full_name}
                  className="w-6 h-6 rounded-full border-2 border-white shadow-sm object-cover"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm border-2 border-white"
                >
                  {card.assignee.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Card?</h3>
                <p className="text-sm text-gray-600 mb-1">
                  Are you sure you want to delete <span className="font-semibold">"{card.title}"</span>?
                </p>
                <p className="text-sm text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete Card
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}