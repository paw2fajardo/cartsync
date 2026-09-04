import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { themeMode, resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-200 active:scale-90 cursor-pointer ${className}`}
      title={`Theme: ${
        themeMode === 'system'
          ? `Auto Device (${resolvedTheme === 'dark' ? 'Dark' : 'Light'})`
          : themeMode === 'dark'
          ? 'Dark'
          : 'Light'
      } — Click to switch`}
      aria-label="Toggle theme mode"
    >
      {themeMode === 'system' ? (
        <Laptop className="w-3.5 h-3.5 stroke-[2.2]" />
      ) : themeMode === 'dark' ? (
        <Moon className="w-3.5 h-3.5 stroke-[2.2] text-amber-400" />
      ) : (
        <Sun className="w-3.5 h-3.5 stroke-[2.2] text-amber-500" />
      )}
    </button>
  );
};
