import React, { useState } from 'react';
import { Check, Trash2, Plus, Minus, Edit3, StickyNote } from 'lucide-react';
import { GroceryItem } from '../types';
import { useGrocery } from '../context/GroceryContext';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';

interface GroceryItemCardProps {
  item: GroceryItem;
}

export const GroceryItemCard: React.FC<GroceryItemCardProps> = ({ item }) => {
  const { toggleItem, updateItem, deleteItem } = useGrocery();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);
  const [editNote, setEditNote] = useState(item.note || '');

  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

  const handleSaveEdit = () => {
    if (editName.trim()) {
      updateItem(item.id, {
        name: editName.trim(),
        note: editNote.trim() || undefined,
      });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setIsEditing(false);
  };

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-150 ${
        item.completed
          ? 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/40 opacity-60 backdrop-blur-xs'
          : 'bg-white/95 dark:bg-slate-800/75 backdrop-blur-md border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600/70 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.35)] shadow-[0_2px_8px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.25)]'
      }`}
    >
      <div className="p-3 sm:p-3.5 flex items-start gap-2 sm:gap-2.5">
        {/* Round Checkbox with 40px Ergonomic Touch Target */}
        <button
          type="button"
          onClick={() => toggleItem(item.id)}
          className="w-10 h-10 -ml-2 -mt-2 -mr-1 flex items-center justify-center shrink-0 cursor-pointer group/cb"
          title={item.completed ? 'Mark as active' : 'Mark as completed'}
          aria-label={item.completed ? 'Mark as active' : 'Mark as completed'}
        >
          <span
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center border transition-all duration-150 group-active/cb:scale-90 ${
              item.completed
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                : 'border-slate-300 dark:border-slate-600 bg-slate-50/80 dark:bg-slate-800/80 group-hover/cb:border-emerald-500 text-transparent'
            }`}
          >
            <Check
              className={`w-3 h-3 stroke-[3] transition-all duration-150 ${
                item.completed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
              }`}
            />
          </span>
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full text-sm font-medium px-3 py-1.5 rounded-xl border border-emerald-500 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                autoFocus
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Item note (optional)"
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs hover:bg-slate-300 dark:hover:bg-slate-600 active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    onClick={() => toggleItem(item.id)}
                    className={`text-[15px] font-semibold tracking-tight cursor-pointer select-none transition-all ${
                      item.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Quantity Badge */}
                  {(item.quantity > 1 || item.unit) && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                        item.completed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/50 dark:border-slate-700/50'
                          : 'bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-200 border-slate-200/60 dark:border-slate-600/60'
                      }`}
                    >
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}
                </div>

                {/* Category Pill */}
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0 transition-opacity ${
                    item.completed ? 'opacity-40' : 'opacity-85'
                  } ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                >
                  {item.category}
                </span>
              </div>

              {/* Note if available */}
              {item.note && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                  <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="italic">{item.note}</span>
                </div>
              )}

              {/* Attribution & Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {/* Device attribution */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.addedBy?.color || '#10b981' }}
                  />
                  <span className="truncate max-w-[150px] sm:max-w-[220px]">
                    {item.completed && item.completedBy
                      ? `Checked by ${item.completedBy.deviceName}`
                      : `Added by ${item.addedBy?.deviceName || 'Household'}`}
                  </span>
                </div>

                {/* Quick Touch Controls */}
                <div className="flex items-center gap-0.5">
                  {!item.completed && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, {
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 active:scale-90 transition-all cursor-pointer"
                        title="Decrease"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, {
                            quantity: item.quantity + 1,
                          })
                        }
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 active:scale-90 transition-all cursor-pointer"
                        title="Increase"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 active:scale-90 transition-all cursor-pointer"
                        title="Edit"
                        aria-label="Edit item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-90 transition-all cursor-pointer"
                    title="Delete"
                    aria-label="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
