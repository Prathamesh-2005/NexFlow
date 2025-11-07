import React, { useEffect, useState, useRef } from 'react';
import { Eye } from 'lucide-react';

export default function EditorPreview({ title, content, doc, activeUsers = [], currentUser, userEdits = {} }) {
  const [highlightedContent, setHighlightedContent] = useState(content);
  const previousContentRef = useRef('');

  useEffect(() => {
    if (!content) {
      setHighlightedContent('');
      return;
    }

    // If no active edits, show normal content
    if (Object.keys(userEdits).length === 0 && previousContentRef.current === content) {
      setHighlightedContent(content);
      return;
    }

    // Detect what changed
    const processedContent = highlightChanges(content, previousContentRef.current, userEdits, currentUser);
    setHighlightedContent(processedContent);
    
    // Store current content for next comparison
    previousContentRef.current = content;

  }, [content, userEdits, currentUser]);

  // Function to highlight recent changes
  const highlightChanges = (newContent, oldContent, edits, user) => {
    if (!newContent) return '';
    
    // Get all users who are currently editing
    const editingUsers = Object.entries(edits).map(([userId, edit]) => ({
      userId,
      ...edit
    }));

    // If someone is editing, apply their color to recently changed text
    if (editingUsers.length > 0) {
      // Parse HTML content
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(newContent, 'text/html');
      const oldDoc = parser.parseFromString(oldContent || '', 'text/html');

      // Find differences and apply colors
      highlightDifferences(newDoc.body, oldDoc.body, editingUsers);

      return newDoc.body.innerHTML;
    }

    return newContent;
  };

  // Recursively highlight differences
  const highlightDifferences = (newNode, oldNode, users) => {
    if (!newNode) return;

    // Text nodes - compare and highlight
    if (newNode.nodeType === Node.TEXT_NODE) {
      const newText = newNode.textContent || '';
      const oldText = oldNode?.textContent || '';

      if (newText !== oldText && newText.trim()) {
        // Get the first editing user's color
        const user = users[0];
        
        // Create a span with the user's color
        const span = document.createElement('span');
        span.className = 'user-edit';
        span.style.backgroundColor = `${user.color}30`;
        span.style.borderLeft = `3px solid ${user.color}`;
        span.style.paddingLeft = '4px';
        span.style.marginLeft = '2px';
        span.style.borderRadius = '2px';
        span.setAttribute('data-user', user.name);
        span.textContent = newText;

        newNode.parentNode?.replaceChild(span, newNode);
      }
      return;
    }

    // Element nodes - recurse through children
    if (newNode.nodeType === Node.ELEMENT_NODE) {
      const newChildren = Array.from(newNode.childNodes);
      const oldChildren = oldNode ? Array.from(oldNode.childNodes) : [];

      newChildren.forEach((child, index) => {
        highlightDifferences(child, oldChildren[index], users);
      });
    }
  };

  return (
    <div className="w-1/2 flex flex-col bg-gray-50">
      {/* Preview Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Live Preview
          </h3>

          {/* Edit Legend */}
          {(Object.keys(userEdits).length > 0 || (activeUsers && activeUsers.length > 0)) && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">Edit colors:</span>
              <div className="flex items-center gap-2">
                {currentUser && (
                  <div className="flex items-center gap-1.5" title="You">
                    <div 
                      className="w-3 h-3 rounded border border-gray-300"
                      style={{ backgroundColor: currentUser.color }}
                    />
                    <span className="text-xs text-gray-600">You</span>
                  </div>
                )}
                {activeUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-1.5" title={user.name}>
                    <div 
                      className="w-3 h-3 rounded border border-gray-300"
                      style={{ backgroundColor: user.color }}
                    />
                    <span className="text-xs text-gray-600">{user.name?.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">{title}</h1>
          <div 
            className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none preview-content"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
          />
        </div>
      </div>

      <style jsx>{`
        .preview-content :global(.user-edit) {
          display: inline;
          position: relative;
          transition: all 0.3s ease;
          animation: highlight-fade 3s ease-out;
        }

        @keyframes highlight-fade {
          0% {
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            opacity: 0.7;
          }
        }

        .preview-content :global(.user-edit:hover::after) {
          content: attr(data-user);
          position: absolute;
          bottom: 100%;
          left: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}