import React, { useState } from 'react';
import { X, User, Mail, Save, Loader2, ImageIcon } from 'lucide-react';
import { useAuthStore } from '../auth/auth';
import { supabaseHelpers } from '../config/supabaseClient';
import { useToast } from './toast';

export default function ProfileSettings({ onClose }) {
  const { profile, updateUserProfile } = useAuthStore();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    setLoading(true);

    try {
      const updated = await supabaseHelpers.updateProfile(profile.id, {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url
      });
      
      updateUserProfile(updated);
      toast.success('Profile updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
            <div className="relative group">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-3xl text-white shadow-xl ring-4 ring-blue-100">
                {formData.full_name.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">
                {formData.full_name || 'User'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{formData.email}</p>
              <div className="mt-3 inline-flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                Active Account
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  disabled
                  value={formData.email}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-gray-50 text-gray-500 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                Email address cannot be changed
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Avatar URL <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                placeholder="https://example.com/avatar.jpg"
              />
              <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                Add a custom profile picture URL
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-semibold shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}