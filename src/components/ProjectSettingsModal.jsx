import React, { useState } from 'react';
import { X, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../config/supabaseClient';

export default function ProjectSettingsModal({ 
  project, 
  currentUserRole, 
  onClose, 
  onUpdate 
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [icon, setIcon] = useState(project.icon || '📁');
  const [color, setColor] = useState(project.color || '#3B82F6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = ['owner', 'admin'].includes(currentUserRole);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name required');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await supabase
        .from('projects')
        .update({ name: name.trim(), description: description.trim(), icon, color })
        .eq('id', project.id);

      if (updateError) throw updateError;

      setSuccess('Settings updated!');
      if (onUpdate) onUpdate({ ...project, name, description, icon, color });
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError('Failed to update settings');
      console.error('Error updating project:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (currentUserRole !== 'owner') return;
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    
    const confirmText = prompt('Type the project name to confirm:');
    if (confirmText !== project.name) {
      setError('Project name does not match');
      return;
    }

    try {
      const { error } = await supabase.from('projects').delete().eq('id', project.id);
      if (error) throw error;
      window.location.href = '/dashboard';
    } catch (err) {
      setError('Failed to delete project');
      console.error('Error deleting project:', err);
    }
  };

  const colorOptions = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];
  const emojiOptions = ['📁', '📊', '🚀', '💼', '🎯', '📝', '🔧', '🎨', '💡', '🏗️'];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* FIXED: Added max-height and proper scrolling */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Fixed header */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Project Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => canEdit && setIcon(emoji)}
                    disabled={!canEdit}
                    className={`w-12 h-12 text-2xl rounded-lg border-2 transition ${
                      icon === emoji 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorOptions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => canEdit && setColor(c)}
                    disabled={!canEdit}
                    className={`w-10 h-10 rounded-lg border-2 transition ${
                      color === c 
                        ? 'border-gray-900 scale-110' 
                        : 'border-transparent hover:scale-105'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="Add a description..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800">{success}</p>
              </div>
            )}

            {canEdit && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}

            {currentUserRole === 'owner' && (
              <div className="pt-6 border-t">
                <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
                <button
                  onClick={handleDelete}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Delete Project
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  This action cannot be undone. All project data will be permanently deleted.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}