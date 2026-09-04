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
      className={`group relative rounded-2xl border transition-all duration-200 ${
        item.completed
          ? 'bg-zinc-50/60 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-70'
          : 'bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm'
      }`}
    >
      <div className="p-3 sm:p-3.5 flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={() => toggleItem(item.id)}
          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition-all shrink-0 ${
            item.completed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:border-emerald-500 text-transparent'
          }`}
          title={item.completed ? 'Mark as active' : 'Mark as completed'}
        >
          <Check className={`w-3.5 h-3.5 stroke-[3] transition-transform ${item.completed ? 'scale-100' : 'scale-50'}`} />
        </button>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-1">
          {isEditing ? (
            <div className="space-y-2 pt-0.5">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-2.5 py-0.5 bg-emerald-500 text-white rounded-md text-xs font-semibold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-md text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-2">
                <span
                  onClick={() => toggleItem(item.id)}
                  className={`text-sm sm:text-base font-semibold cursor-pointer transition-all ${
                    item.completed
                      ? 'line-through text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  {item.name}
                </span>

                {/* Quantity Badge */}
                {(item.quantity > 1 || item.unit) && (
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      item.completed
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    {item.quantity} {item.unit || ''}
                  </span>
                )}
              </div>

              {/* Category Pill */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                >
                  {item.category}
                </span>
              </div>
            </div>
          )}

          {/* Note if available */}
          {!isEditing && item.note && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/20 px-2 py-0.5 rounded-md w-fit">
              <StickyNote className="w-3 h-3 shrink-0" />
              <span className="italic">{item.note}</span>
            </div>
          )}

          {/* Attribution Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-2">
              {/* Added By Device Badge */}
              <div className="flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.addedBy?.color || '#10b981' }}
                />
                <span className="font-medium text-zinc-600 dark:text-zinc-300">
                  Added by {item.addedBy?.deviceName || 'Household'}
                </span>
              </div>

              {/* Completed By Attribution */}
              {item.completed && item.completedBy && (
                <span className="text-zinc-600 dark:text-zinc-300">
                  • Checked by {item.completedBy.deviceName}
                </span>
              )}
            </div>

            {/* Hover / Touch Quick Action Toolbar */}
            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              {!item.completed && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(item.id, {
                        quantity: Math.max(1, item.quantity - 1),
                      })
                    }
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Decrease quantity"
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
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Increase quantity"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    title="Edit item"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => deleteItem(item.id)}
                className="p-1 rounded-md text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
