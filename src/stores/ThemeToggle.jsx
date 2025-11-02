import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyTheme = (selectedTheme) => {
    if (selectedTheme === 'system') {
      const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPreference) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    setShowMenu(false);
  };

  const getThemeIcon = () => {
    if (theme === 'dark') return <Moon className="w-5 h-5" />;
    if (theme === 'light') return <Sun className="w-5 h-5" />;
    return <Monitor className="w-5 h-5" />;
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
        aria-label="Toggle theme"
      >
        {getThemeIcon()}
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          <button
            onClick={() => handleThemeChange('light')}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition"
          >
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4" />
              <span>System</span>
            </div>
            {theme === 'system' && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          </button>
        </div>
      )}
    </div>
  );
}