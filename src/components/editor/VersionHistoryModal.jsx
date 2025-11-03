import React, { useState } from 'react';
import { History, X } from 'lucide-react';

export default function VersionHistoryModal({ versions, onClose, onRestore }) {
  const [selected, setSelected] = useState(null);

  return (
    <div 
      onClick={onClose} 
      className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Version History</h2>
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
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <History className="w-12 h-12 mb-3" />
                <p className="text-sm font-medium">No version history yet</p>
              </div>
            ) : (
              versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelected(v)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selected?.id === v.id
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-50 text-gray-900 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${
                      selected?.id === v.id ? 'text-white' : 'text-gray-900'
                    }`}>
                      {new Date(v.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className={`text-xs ${
                    selected?.id === v.id ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    By {v.profiles?.full_name || 'Unknown User'}
                  </p>
                  <p className={`text-xs mt-1 font-medium ${
                    selected?.id === v.id ? 'text-gray-400' : 'text-gray-500'
                  }`}>
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
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{selected.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Edited by <span className="font-medium">{selected.profiles?.full_name || 'Unknown User'}</span> on{' '}
                      {new Date(selected.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestore(selected)}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                  >
                    <History className="w-4 h-4" />
                    Restore Version
                  </button>
                </div>
                <div className="pt-2">
                  <div 
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ 
                      __html: typeof selected.content === 'string' 
                        ? selected.content 
                        : selected.content.content 
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <History className="w-16 h-16 mb-4" />
                <p className="text-lg font-semibold text-gray-500">Select a version to preview</p>
                <p className="text-sm text-gray-400 mt-2">Click on any version from the sidebar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}