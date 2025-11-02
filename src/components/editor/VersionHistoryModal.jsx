import React, { useState } from 'react';
import { History, X } from 'lucide-react';

export default function VersionHistoryModal({ versions, onClose, onRestore }) {
  const [selected, setSelected] = useState(null);

  return (
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Version History</h2>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Versions List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto p-4 space-y-2">
            {versions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No version history yet</p>
            ) : (
              versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selected?.id === v.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    By {v.profiles?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    Version {v.version_number}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {selected ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{selected.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Edited by {selected.profiles?.full_name || 'Unknown User'} on{' '}
                      {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(selected)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <History className="w-4 h-4" />
                    Restore This Version
                  </button>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div 
                    className="prose prose-sm sm:prose lg:prose-lg max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: typeof selected.content === 'string' 
                        ? selected.content 
                        : selected.content.content 
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <History className="w-16 h-16 mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a version to preview</p>
                <p className="text-sm text-gray-400 mt-2">Click on any version from the left sidebar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}