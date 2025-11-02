import React, { useState } from 'react';
import { X, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { supabase } from '../config/supabaseClient';
import { useToast } from './toast';

const PRESET_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
];

export default function CreateColumnModal({ onClose, onCreate, boardId, existingColumns = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    color: '#6B7280'
  });
  const [loading, setLoading] = useState(false);
  const [showManageColumns, setShowManageColumns] = useState(false);
  const [editingColumn, setEditingColumn] = useState(null);
  const [deletingColumn, setDeletingColumn] = useState(null);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    await onCreate(formData);
    setLoading(false);
  };

  const confirmDeleteColumn = (column) => {
    setDeletingColumn(column);
  };

  const handleDeleteColumn = async () => {
    if (!deletingColumn) return;

    try {
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', deletingColumn.id);

      if (error) throw error;

      toast.success('Column deleted successfully');
      setDeletingColumn(null);
      
      // Refresh page or update state
      window.location.reload();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error('Failed to delete column');
      setDeletingColumn(null);
    }
  };

  const handleUpdateColumn = async (columnId, updates) => {
    try {
      const { error } = await supabase
        .from('board_columns')
        .update(updates)
        .eq('id', columnId);

      if (error) throw error;

      setEditingColumn(null);
      toast.success('Column updated successfully');
      
      // Refresh page or update state
      window.location.reload();
    } catch (error) {
      console.error('Error updating column:', error);
      toast.error('Failed to update column');
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Column Manager</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Create New Column */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create New Column
              </label>
              <input
                type="text"
                required
                autoFocus
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="e.g., In Review, Testing, Deployed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-lg transition ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
            >
              {loading ? 'Creating...' : 'Create Column'}
            </button>
          </form>

          {/* Manage Existing Columns */}
          {existingColumns && existingColumns.length > 0 && (
            <div className="border-t pt-6">
              <button
                type="button"
                onClick={() => setShowManageColumns(!showManageColumns)}
                className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition text-sm font-medium text-gray-700"
              >
                <span>Manage Existing Columns</span>
                <span className="text-gray-500">{existingColumns.length} columns</span>
              </button>

              {showManageColumns && (
                <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                  {existingColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: column.color }}
                      />
                      
                      {editingColumn === column.id ? (
                        <input
                          type="text"
                          defaultValue={column.name}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== column.name) {
                              handleUpdateColumn(column.id, { name: e.target.value.trim() });
                            } else {
                              setEditingColumn(null);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.target.blur();
                            } else if (e.key === 'Escape') {
                              setEditingColumn(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none"
                        />
                      ) : (
                        <>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">{column.name}</p>
                            <p className="text-xs text-gray-500">
                              {column.cards?.length || 0} card(s)
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setEditingColumn(column.id)}
                            className="p-2 hover:bg-gray-200 rounded transition"
                            title="Edit column name"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => confirmDeleteColumn(column)}
                            className="p-2 hover:bg-red-100 rounded transition"
                            title="Delete column"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingColumn && (
        <div
          onClick={() => setDeletingColumn(null)}
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Column?</h3>
                <p className="text-sm text-gray-600 mb-1">
                  Are you sure you want to delete <span className="font-semibold">{deletingColumn.name}</span>?
                </p>
                {deletingColumn.cards?.length > 0 && (
                  <p className="text-sm text-red-600 font-medium">
                    This will also delete {deletingColumn.cards.length} card(s) in this column.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingColumn(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteColumn}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
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