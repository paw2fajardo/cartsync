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
          ? 'bg-zinc-50/40 dark:bg-zinc-900/20 border-zinc-200/50 dark:border-zinc-800/40 opacity-60'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-[0_1px_3px_rgba(0,0,0,0.02)]'
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
                : 'border-zinc-300 dark:border-zinc-600 bg-zinc-50/60 dark:bg-zinc-800/60 group-hover/cb:border-emerald-500 text-transparent'
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
                className="w-full text-sm font-medium px-3 py-1.5 rounded-xl border border-emerald-500 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden"
                autoFocus
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Item note (optional)"
                className="w-full text-xs px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
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
                  className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs hover:bg-zinc-300 dark:hover:bg-zinc-600 active:scale-95 transition-all cursor-pointer"
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
                        ? 'line-through text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-900 dark:text-zinc-100 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Quantity Badge */}
                  {(item.quantity > 1 || item.unit) && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                        item.completed
                          ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
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
                <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 pt-0.5">
                  <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="italic">{item.note}</span>
                </div>
              )}

              {/* Attribution & Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
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
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
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
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
                        title="Increase"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
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
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-90 transition-all cursor-pointer"
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
