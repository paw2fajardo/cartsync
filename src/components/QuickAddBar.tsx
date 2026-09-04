import React, { useState, useRef } from 'react';
import { Plus, Tag, X } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { parseItemInput, CATEGORY_COLORS } from '../utils/smartCategorizer';
import { ItemCategory } from '../types';

const ALL_CATEGORIES: ItemCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Pantry',
  'Frozen',
  'Snacks & Sweets',
  'Beverages',
  'Household & Cleaning',
  'Pharmacy & Health',
  'Personal Care',
  'Baby & Pet',
  'Other',
];

export const QuickAddBar: React.FC = () => {
  const { addItem, activeList } = useGrocery();
  const [inputText, setInputText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [category, setCategory] = useState<ItemCategory>('Produce');
  const [isCategoryCustomized, setIsCategoryCustomized] = useState(false);
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      const parsed = parseItemInput(val);
      if (!isCategoryCustomized) {
        setCategory(parsed.category);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseItemInput(inputText);
    const finalName = parsed.name;
    const finalQty = parsed.quantity;
    const finalUnit = parsed.unit;
    const finalCategory = isCategoryCustomized ? category : parsed.category;

    await addItem(finalName, finalQty, finalUnit, finalCategory, note.trim() || undefined);

    // Reset state
    setInputText('');
    setNote('');
    setShowOptions(false);
    setIsCategoryCustomized(false);
    inputRef.current?.focus();
  };

  const parsedPreview = inputText.trim() ? parseItemInput(inputText) : null;
  const currentCategoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] transition-colors">
      <div className="max-w-2xl mx-auto space-y-2">
        {/* Optional Expanded Tray for Note / Custom Category */}
        {showOptions && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/70 animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs shadow-xs">
            {/* Category Select */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Category:</span>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as ItemCategory);
                  setIsCategoryCustomized(true);
                }}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 font-medium focus:outline-hidden cursor-pointer"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Note input */}
            <div className="flex-1 min-w-[150px]">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note (e.g., brand, flavor)..."
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500"
                maxLength={60}
              />
            </div>

            <button
              type="button"
              onClick={() => setShowOptions(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
              title="Close options"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Floating Quick-Add Input */}
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <div className="relative flex-1 flex items-center bg-slate-100/90 dark:bg-slate-850/90 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all px-3.5 py-1.5 h-11">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={`Add to ${activeList?.name || 'list'} (e.g. "Milk 2L", "3 Lemons")...`}
              className="flex-1 bg-transparent text-[14px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden pr-2"
            />

            {/* Subtle Live NLP Category / Quantity Badge */}
            {parsedPreview && (
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {parsedPreview.quantity > 1 && (
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
                    {parsedPreview.quantity} {parsedPreview.unit || ''}
                  </span>
                )}
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${currentCategoryColor.bg} ${currentCategoryColor.text} ${currentCategoryColor.border}`}
                >
                  {category}
                </span>
              </div>
            )}

            {/* Toggle Note / Category Tray Button */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`ml-1.5 p-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                showOptions || note || isCategoryCustomized
                  ? 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/80'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Add details (category, note)"
            >
              <Tag className="w-4 h-4" />
            </button>
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="h-11 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-30 text-white text-sm font-semibold flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline tracking-tight">Add</span>
          </button>
        </form>
      </div>
    </div>
  );
};
