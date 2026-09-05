import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';

export const UndoToast: React.FC = () => {
  const { lastDeletedItem, undoLastDelete, dismissUndoToast } = useGrocery();

  if (!lastDeletedItem) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-200 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-800/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <p className="text-xs font-medium text-slate-200 truncate">
            Deleted{' '}
            <span className="font-semibold text-white">
              {lastDeletedItem.quantity > 1 ? `${lastDeletedItem.quantity}× ` : ''}
              {lastDeletedItem.name}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={undoLastDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Undo</span>
          </button>
          <button
            type="button"
            onClick={dismissUndoToast}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
