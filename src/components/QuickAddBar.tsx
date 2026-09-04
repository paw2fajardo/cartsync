import React, { useState, useRef } from 'react';
import { Plus, Tag, StickyNote, Minus, Sparkles } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { parseItemInput, CATEGORY_COLORS } from '../utils/smartCategorizer';
import { ItemCategory } from '../types';

const COMMON_SUGGESTIONS = [
  { name: 'Bananas', category: 'Produce' as ItemCategory, qty: 1, unit: 'bunch' },
  { name: 'Whole Milk', category: 'Dairy & Eggs' as ItemCategory, qty: 1, unit: 'carton' },
  { name: 'Eggs', category: 'Dairy & Eggs' as ItemCategory, qty: 12, unit: 'pack' },
  { name: 'Avocados', category: 'Produce' as ItemCategory, qty: 3, unit: 'pcs' },
  { name: 'Sourdough Bread', category: 'Bakery' as ItemCategory, qty: 1, unit: 'loaf' },
  { name: 'Ground Coffee', category: 'Beverages' as ItemCategory, qty: 1, unit: 'bag' },
  { name: 'Olive Oil', category: 'Pantry' as ItemCategory, qty: 1, unit: 'bottle' },
  { name: 'Paper Towels', category: 'Household & Cleaning' as ItemCategory, qty: 1, unit: 'pack' },
];

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

const COMMON_UNITS = ['', 'pcs', 'pack', 'kg', 'lbs', 'box', 'bag', 'bottle', 'carton'];

export const QuickAddBar: React.FC = () => {
  const { addItem, activeList } = useGrocery();
  const [inputText, setInputText] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('');
  const [category, setCategory] = useState<ItemCategory>('Produce');
  const [isCategoryCustomized, setIsCategoryCustomized] = useState(false);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      const parsed = parseItemInput(val);
      if (!isCategoryCustomized) {
        setCategory(parsed.category);
      }
      if (parsed.quantity > 1 && quantity === 1) {
        setQuantity(parsed.quantity);
      }
      if (parsed.unit && !unit) {
        setUnit(parsed.unit);
      }
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseItemInput(inputText);
    const finalName = parsed.name;
    const finalQty = quantity > 0 ? quantity : parsed.quantity;
    const finalUnit = unit || parsed.unit;
    const finalCategory = isCategoryCustomized ? category : parsed.category;

    await addItem(finalName, finalQty, finalUnit, finalCategory, note);

    // Reset state
    setInputText('');
    setQuantity(1);
    setUnit('');
    setNote('');
    setShowNoteInput(false);
    setShowCategoryPicker(false);
    setIsCategoryCustomized(false);
    inputRef.current?.focus();
  };

  const handleSuggestionClick = async (sug: typeof COMMON_SUGGESTIONS[0]) => {
    await addItem(sug.name, sug.qty, sug.unit, sug.category);
  };

  const currentCategoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  return (
    <div className="space-y-3">
      {/* Main Input Form */}
      <form
        onSubmit={handleAdd}
        className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-3 sm:p-4 shadow-sm hover:shadow-md focus-within:shadow-md focus-within:border-emerald-500/80 transition-all space-y-3"
      >
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={`Add item to ${activeList?.name || 'list'}... (e.g. "2 Honeycrisp apples")`}
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-hidden"
          />

          {/* Quantity Controls */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl px-1.5 py-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              title="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="p-1 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
              title="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>

        {/* Options Row: Category, Unit, Note Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Tag Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-medium transition-colors ${currentCategoryColor.bg} ${currentCategoryColor.text} ${currentCategoryColor.border}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentCategoryColor.dot}`}></span>
                <span>{category}</span>
                <Tag className="w-3 h-3 opacity-60 ml-0.5" />
              </button>

              {showCategoryPicker && (
                <div className="absolute left-0 top-full mt-2 z-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-2 shadow-xl grid grid-cols-2 gap-1 w-64 max-h-56 overflow-y-auto">
                  {ALL_CATEGORIES.map((cat) => {
                    const catStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => {
                          setCategory(cat);
                          setIsCategoryCustomized(true);
                          setShowCategoryPicker(false);
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                          category === cat
                            ? `${catStyle.bg} ${catStyle.text} font-bold`
                            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`}></span>
                        <span className="truncate">{cat}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unit Selector */}
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-zinc-100 dark:bg-zinc-800 border-none text-zinc-700 dark:text-zinc-300 rounded-xl px-2.5 py-1 text-[11px] font-medium focus:outline-hidden"
            >
              <option value="">No unit</option>
              {COMMON_UNITS.filter(Boolean).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>

            {/* Note toggle */}
            <button
              type="button"
              onClick={() => setShowNoteInput(!showNoteInput)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] transition-colors ${
                showNoteInput || note
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-medium'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <StickyNote className="w-3 h-3" />
              <span>{note ? 'Edit Note' : 'Add Note'}</span>
            </button>
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-300 hidden md:flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-500" />
            <span>Smart auto-categorize active</span>
          </div>
        </div>

        {/* Expandable Note Input */}
        {showNoteInput && (
          <div className="pt-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Organic only, check expiration date..."
              className="w-full px-3 py-1.5 text-xs rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 placeholder:text-amber-400 focus:outline-hidden"
              maxLength={80}
            />
          </div>
        )}
      </form>

      {/* Quick Suggestions Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider pl-1 shrink-0">
          Staples:
        </span>
        {COMMON_SUGGESTIONS.map((sug) => (
          <button
            key={sug.name}
            onClick={() => handleSuggestionClick(sug)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-300 text-zinc-700 dark:text-zinc-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-xs font-medium whitespace-nowrap transition-all shadow-xs"
          >
            <Plus className="w-3 h-3 opacity-60" />
            <span>{sug.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
