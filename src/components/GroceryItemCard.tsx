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
          ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40 opacity-60'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-xs'
      }`}
    >
      <div className="p-3 sm:p-3.5 flex items-start gap-3">
        {/* Round Checkbox */}
        <button
          type="button"
          onClick={() => toggleItem(item.id)}
          className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all shrink-0 active:scale-90 ${
            item.completed
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-zinc-300 dark:border-zinc-600 bg-zinc-50/80 dark:bg-zinc-800 hover:border-emerald-500 text-transparent'
          }`}
          title={item.completed ? 'Mark as active' : 'Mark as completed'}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${item.completed ? 'scale-100' : 'scale-50'}`} />
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
                className="w-full text-sm font-semibold px-2.5 py-1 rounded-lg border border-emerald-500 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-hidden"
                autoFocus
              />
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Item note (optional)"
                className="w-full text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
              />
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 bg-emerald-500 text-white rounded-lg text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg text-xs"
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
                    className={`text-sm sm:text-base font-semibold cursor-pointer select-none transition-all ${
                      item.completed
                        ? 'line-through text-zinc-400 dark:text-zinc-500'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Quantity Badge */}
                  {(item.quantity > 1 || item.unit) && (
                    <span
                      className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
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
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border shrink-0 ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                >
                  {item.category}
                </span>
              </div>

              {/* Note if available */}
              {item.note && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <StickyNote className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="italic">{item.note}</span>
                </div>
              )}

              {/* Attribution & Actions Footer */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
                {/* Device attribution */}
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.addedBy?.color || '#10b981' }}
                  />
                  <span>
                    {item.completed && item.completedBy
                      ? `Checked by ${item.completedBy.deviceName}`
                      : `Added by ${item.addedBy?.deviceName || 'Household'}`}
                  </span>
                </div>

                {/* Quick Touch Controls */}
                <div className="flex items-center gap-1">
                  {!item.completed && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, {
                            quantity: Math.max(1, item.quantity - 1),
                          })
                        }
                        className="p-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, {
                            quantity: item.quantity + 1,
                          })
                        }
                        className="p-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Edit"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    className="p-1 rounded text-zinc-600 dark:text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
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
