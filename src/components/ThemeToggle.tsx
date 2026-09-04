import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { themeMode, resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-full text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 transition-all duration-200 active:scale-90 ${className}`}
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
