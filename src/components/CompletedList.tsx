import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryItemCard } from './GroceryItemCard';

export const CompletedList: React.FC = () => {
  const { completedItems, clearCompleted, uncheckAll, activeList } = useGrocery();
  const [isOpen, setIsOpen] = useState(false);

  if (completedItems.length === 0) return null;

  return (
    <div className="pt-4 border-t border-slate-200/70 dark:border-slate-800/70 space-y-3">
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 py-1 px-1.5 -ml-1 rounded-xl text-xs font-semibold tracking-tight text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Completed</span>
            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">
              ({completedItems.length})
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => uncheckAll(activeList?.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 active:scale-95 transition-all cursor-pointer"
            title="Move all completed back to active list"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Uncheck all</span>
          </button>
          <button
            type="button"
            onClick={() => clearCompleted(activeList?.id)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
            title="Permanently remove completed items"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Items list */}
      {isOpen && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          {completedItems.map((item) => (
            <GroceryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
