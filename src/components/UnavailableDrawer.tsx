import React, { useState } from 'react';
import { ChevronDown, ChevronRight, PackageX, RotateCcw, Trash2 } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';

export const UnavailableDrawer: React.FC = () => {
  const { unavailableItems, restoreUnavailableItem, deleteItem } = useGrocery();
  const [isOpen, setIsOpen] = useState(true);

  if (!unavailableItems || unavailableItems.length === 0) return null;

  return (
    <div className="pt-2 border-t border-amber-200/50 dark:border-amber-900/40 space-y-2">
      {/* Collapsible Drawer Header */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 py-1 px-2 -ml-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
        >
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="flex items-center gap-1.5">
            <PackageX className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Not Available</span>
            <span className="text-[11px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-200/70 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
              {unavailableItems.length}
            </span>
          </div>
        </button>

        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
          Restored at trip finish
        </span>
      </div>

      {/* Drawer Item List */}
      {isOpen && (
        <div className="space-y-1.5 animate-in fade-in duration-150">
          {unavailableItems.map((item) => (
            <div
              key={item.id}
              className="py-2 px-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.name}
                    </span>
                    {(item.quantity > 1 || item.unit) && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                        {item.quantity} {item.unit || ''}
                      </span>
                    )}
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60">
                      {item.category}
                    </span>
                  </div>
                  {item.unavailableBy && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
                      Flagged by {item.unavailableBy}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions: Restore to Active & Delete */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => restoreUnavailableItem(item.id)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-xl text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 hover:bg-emerald-200/80 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/70 active:scale-95 transition-all cursor-pointer"
                  title="Return to active shopping list"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
                  title="Permanently remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
