import React from 'react';
import { 
  ArrowLeft, 
  Save, 
  Clock, 
  History, 
  Eye, 
  EyeOff, 
  Share2,
  Wifi,
  WifiOff,
  Users
} from 'lucide-react';

export default function EditorHeader({
  title,
  onTitleChange,
  saving,
  lastSaved,
  activeUsers = [],
  currentUser,
  onBack,
  onVersionHistory,
  showPreview,
  onTogglePreview,
  isOnline,
  onShare,
  canEdit
}) {
  const formatLastSaved = (date) => {
    if (!date) return 'Never saved';
    
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  // Combine current user with active users
  const allUsers = currentUser ? [currentUser, ...activeUsers] : activeUsers;

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="font-medium">Back</span>
            </button>

            <div className="h-6 w-px bg-gray-300" />

            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="text-2xl font-bold border-none outline-none flex-1 bg-transparent min-w-0 px-2 py-1 rounded hover:bg-gray-50 focus:bg-gray-50 transition-colors"
              placeholder="Untitled Page"
              disabled={!canEdit}
            />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Save Status */}
            <div className="flex items-center gap-2 text-sm">
              {saving ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Save className="w-4 h-4 animate-pulse" />
                  <span className="font-medium">Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{formatLastSaved(lastSaved)}</span>
                </div>
              ) : null}
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Online/Offline Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
              isOnline 
                ? 'bg-green-50 text-green-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm font-medium">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm font-medium">Offline</span>
                </>
              )}
            </div>

            <div className="h-6 w-px bg-gray-300" />

            {/* Active Users */}
            {allUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {allUsers.length} {allUsers.length === 1 ? 'user' : 'users'}
                  </span>
                </div>
                <div className="flex -space-x-2">
                  {allUsers.slice(0, 5).map((user, index) => (
                    <div
                      key={user.id || index}
                      className="relative group"
                    >
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.name || user.full_name || user.email}
                          className="w-8 h-8 rounded-full border-2 border-white shadow-sm hover:z-10 transition-transform hover:scale-110"
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white shadow-sm hover:z-10 transition-transform hover:scale-110 cursor-pointer"
                          style={{ backgroundColor: user.color }}
                        >
                          {(user.name || user.full_name || user.email)?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Online indicator for current user */}
                      {user.id === currentUser?.id && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                      {/* Tooltip - positioned below */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {user.name || user.full_name || user.email}
                        {user.id === currentUser?.id && ' (You)'}
                      </div>
                    </div>
                  ))}
                  {allUsers.length > 5 && (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-700 text-xs font-medium border-2 border-white shadow-sm hover:z-10 transition-transform hover:scale-110 cursor-pointer group"
                    >
                      +{allUsers.length - 5}
                      {/* Tooltip - positioned below */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {allUsers.length - 5} more users
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="h-6 w-px bg-gray-300" />

            {/* Action Buttons */}
            <button
              onClick={onVersionHistory}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Version History"
            >
              <History className="w-5 h-5" />
            </button>

            <button
              onClick={onTogglePreview}
              className={`p-2 rounded-lg transition-colors ${
                showPreview
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={showPreview ? 'Hide Preview' : 'Show Preview'}
            >
              {showPreview ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>

            <button
              onClick={onShare}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}