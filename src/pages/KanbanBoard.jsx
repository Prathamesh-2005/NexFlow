import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../auth/auth';
import { useProjectStore } from '../stores/projectstore';
import { supabase } from '../config/supabaseClient';
import { 
  Plus, 
  MoreVertical, 
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Link as LinkIcon,
  X,
  Edit,
  Trash2,
  Clock,
  Filter,
  Search
} from 'lucide-react';

export default function KanbanBoard() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const { currentProject, boards, createCard, updateCard, moveCard } = useProjectStore();
  
  const [board, setBoard] = useState(null);
  const [columns, setColumns] = useState([]);
  const [draggedCard, setDraggedCard] = useState(null);
  const [draggedOverColumn, setDraggedOverColumn] = useState(null);
  const [showCreateCard, setShowCreateCard] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');

  useEffect(() => {
    if (boards.length > 0) {
      const mainBoard = boards[0];
      setBoard(mainBoard);
      setColumns(mainBoard.board_columns || []);
    }
  }, [boards]);

  const handleDragStart = (e, card, columnId) => {
    setDraggedCard({ card, columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    
    if (!draggedCard) return;

    const { card, columnId: sourceColumnId } = draggedCard;

    if (sourceColumnId === targetColumnId) {
      setDraggedCard(null);
      setDraggedOverColumn(null);
      return;
    }

    try {
      const targetColumn = columns.find(c => c.id === targetColumnId);
      const newPosition = targetColumn.cards?.length || 0;

      await moveCard(card.id, targetColumnId, newPosition);

      setColumns(prevColumns => {
        return prevColumns.map(col => {
          if (col.id === sourceColumnId) {
            return {
              ...col,
              cards: col.cards.filter(c => c.id !== card.id)
            };
          }
          if (col.id === targetColumnId) {
            return {
              ...col,
              cards: [...(col.cards || []), { ...card, column_id: targetColumnId, position: newPosition }]
            };
          }
          return col;
        });
      });
    } catch (error) {
      console.error('Error moving card:', error);
    }

    setDraggedCard(null);
    setDraggedOverColumn(null);
  };

  const handleCreateCard = async (columnId, cardData) => {
    try {
      await createCard({
        ...cardData,
        column_id: columnId,
        created_by: profile.id,
        position: columns.find(c => c.id === columnId)?.cards?.length || 0
      });
      setShowCreateCard(null);
    } catch (error) {
      console.error('Error creating card:', error);
    }
  };

  const filteredColumns = columns.map(column => ({
    ...column,
    cards: (column.cards || []).filter(card => {
      const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           card.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAssignee = filterAssignee === 'all' || card.assignee_id === filterAssignee;
      return matchesSearch && matchesAssignee;
    })
  }));

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <BoardHeader 
        board={board} 
        project={currentProject}
        onBack={() => navigate(`/project/${projectId}`)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterAssignee={filterAssignee}
        setFilterAssignee={setFilterAssignee}
      />

      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full" style={{ minWidth: `${columns.length * 320}px` }}>
          {filteredColumns.map((column) => (
            <Column
              key={column.id}
              column={column}
              isDraggedOver={draggedOverColumn === column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
              onDragStart={handleDragStart}
              onCreateCard={() => setShowCreateCard(column.id)}
              onEditCard={setEditingCard}
            />
          ))}
        </div>
      </div>

      {showCreateCard && (
        <CreateCardModal
          columnId={showCreateCard}
          onClose={() => setShowCreateCard(null)}
          onCreate={handleCreateCard}
        />
      )}

      {editingCard && (
        <EditCardModal
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onUpdate={updateCard}
        />
      )}
    </div>
  );
}

function BoardHeader({ board, project, onBack, searchQuery, setSearchQuery, filterAssignee, setFilterAssignee }) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">{board.name}</h1>
            <p className="text-sm text-gray-600">{project?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Assignees</option>
          </select>
        </div>
      </div>
    </header>
  );
}

function Column({ column, isDraggedOver, onDragOver, onDragLeave, onDrop, onDragStart, onCreateCard, onEditCard }) {
  return (
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
          <span className="text-sm text-gray-500">({column.cards?.length || 0})</span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded transition">
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {(column.cards || []).map((card) => (
          <Card
            key={card.id}
            card={card}
            columnId={column.id}
            onDragStart={onDragStart}
            onEdit={onEditCard}
          />
        ))}
      </div>

      <button
        onClick={onCreateCard}
        className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add Card</span>
      </button>
    </div>
  );
}

function Card({ card, columnId, onDragStart, onEdit }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card, columnId)}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition group"
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex-1 pr-2">{card.title}</h4>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-100 rounded transition"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
              <button
                onClick={() => {
                  onEdit(card);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {card.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {card.priority && (
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(card.priority)}`}>
              {card.priority}
            </span>
          )}
          
          {card.due_date && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Calendar className="w-3 h-3" />
              {new Date(card.due_date).toLocaleDateString()}
            </div>
          )}
        </div>

        {card.assignee && (
          <div
            className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium"
            title={card.assignee.full_name}
          >
            {card.assignee.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
        )}
      </div>
    </div>
  );
}

function CreateCardModal({ columnId, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setLoading(true);
    await onCreate(columnId, formData);
    setLoading(false);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Card</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              autoFocus
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Card title..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows="3"
              placeholder="Add details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
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
              disabled={loading || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCardModal({ card, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: card.title,
    description: card.description || '',
    priority: card.priority || 'medium',
    due_date: card.due_date || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onUpdate(card.id, formData);
    setLoading(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Card</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows="3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}