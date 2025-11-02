import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [], onNavigate }) {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 py-2">
      <button
        onClick={() => onNavigate('/')}
        className="flex items-center gap-1 hover:text-gray-900 transition-colors"
      >
        <Home className="w-4 h-4" />
        Home
      </button>

      {items.map((item, index) => (
        <React.Fragment key={item.id || index}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => item.path && onNavigate(item.path)}
            className={`hover:text-gray-900 transition-colors ${
              index === items.length - 1 ? 'font-semibold text-gray-900' : ''
            }`}
            disabled={index === items.length - 1}
          >
            {item.title}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}