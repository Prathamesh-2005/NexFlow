import React, { useState, useEffect } from 'react';
import { X, User, Mail, Save, Loader2 } from 'lucide-react';
import { useAuthStore } from '../auth/auth';
import { supabaseHelpers } from '../config/supabaseClient';
import { useToast } from './toast';

export default function ProfileSettings({ onClose }) {
  const { profile, updateUserProfile } = useAuthStore();
  const { toast } = useToast(); 
  const [loading, setLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || ''
  });

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false);
  }, [formData.avatar_url]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      console.log('💾 Saving profile changes...');
      const startTime = performance.now();
      
      // Save to database
      const updated = await supabaseHelpers.updateProfile(profile.id, {
        full_name: formData.full_name,
        avatar_url: formData.avatar_url
      });
      
      const endTime = performance.now();
      console.log(`✅ Saved in ${(endTime - startTime).toFixed(2)}ms`);
      
      // Update local state with server response
      updateUserProfile(updated);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Profile updated successfully",
        variant: "success"
      });
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 800);
      
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      
      // Show error toast
      toast({
        title: "Error",
        description: error.message || 'Failed to update profile',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if avatar URL is valid
  const hasValidAvatar = formData.avatar_url && !imageError;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Profile Settings</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
              <div className="relative group">
                {hasValidAvatar ? (
                  <img
                    src={formData.avatar_url}
                    alt={formData.full_name}
                    onError={() => {
                      console.log('❌ Failed to load avatar image');
                      setImageError(true);
                    }}
                    onLoad={() => {
                      console.log('✅ Avatar image loaded successfully');
                    }}
                    className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-gray-100"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-700 to-gray-900 rounded-full flex items-center justify-center text-3xl text-white shadow-lg ring-4 ring-gray-100">
                    {formData.full_name.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {formData.full_name || 'User'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{formData.email}</p>
                <div className="mt-3 inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                  ✓ Active Account
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 bg-gray-50 text-gray-500 rounded-lg outline-none cursor-not-allowed text-sm"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Email address cannot be changed
                </p>
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Avatar URL <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all text-sm"
                  placeholder="https://example.com/avatar.jpg"
                  disabled={loading}
                />
                {imageError && formData.avatar_url && (
                  <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                    <span className="inline-block w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                    Failed to load image. Please check the URL.
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  Add a custom profile picture URL
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-sm hover:shadow-md"
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
          </div>
        </form>
      </div>
    </div>
  );
}