import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, SlidersHorizontal, X, ArrowRight, History } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { parseItemInput, CATEGORY_COLORS } from '../utils/smartCategorizer';
import { normalizeCleanName } from '../utils/nameNormalization';
import { ItemCategory, DeviceItemHistory } from '../types';

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
  'Baby Care',
  'Pet Care',
  'Other',
];

export const QuickAddBar: React.FC = () => {
  const {
    addItem,
    items,
    activeList,
    lists,
    autoListRules,
    deviceItemHistory,
    removeDeviceHistoryItem,
    openReplenishmentDrawer,
    isQuickAddOptionsOpen,
    setIsQuickAddOptionsOpen,
  } = useGrocery();
  const { device, activeHouseholdDevices } = useDevice();
  const [inputText, setInputText] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Produce');
  const [isCategoryCustomized, setIsCategoryCustomized] = useState(false);
  const [note, setNote] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dismissedNames, setDismissedNames] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Scoped history strictly by friendly deviceName, combining deviceItemHistory + items already added by this device
  const scopedHistory = useMemo(() => {
    const list: DeviceItemHistory[] = [];
    const seen = new Set<string>();
    const currentName = device.name.trim().toLowerCase();

    // 1. Prioritize explicit device purchase history
    for (const h of deviceItemHistory || []) {
      const hName = (h.deviceName || '').trim().toLowerCase();
      if (hName === currentName) {
        const clean = normalizeCleanName(h.cleanName);
        const lower = clean.toLowerCase();
        if (clean && !seen.has(lower) && !dismissedNames.has(lower)) {
          seen.add(lower);
          list.push({ ...h, cleanName: clean });
        }
      }
    }

    // 2. Also include all items previously added (or contributed to) by any device sharing this deviceName
    for (const item of items || []) {
      // Check author/creator
      const authorDev = item.addedBy;
      const directAuthorDevName = (authorDev?.deviceName || '').trim().toLowerCase();
      const matchedAuthorProfile = authorDev?.deviceId
        ? activeHouseholdDevices.find((d) => d.id === authorDev.deviceId)
        : null;
      const matchedAuthorDevName = (matchedAuthorProfile?.name || '').trim().toLowerCase();

      // Check contributors if any
      const isContributor = (item.contributors || []).some((c) => {
        const directCName = (c.deviceName || '').trim().toLowerCase();
        const matchedContrProfile = c.deviceId
          ? activeHouseholdDevices.find((d) => d.id === c.deviceId)
          : null;
        const matchedCName = (matchedContrProfile?.name || '').trim().toLowerCase();
        return directCName === currentName || matchedCName === currentName;
      });

      const isAddedByThisDeviceName =
        directAuthorDevName === currentName ||
        matchedAuthorDevName === currentName ||
        isContributor;

      if (isAddedByThisDeviceName) {
        const clean = normalizeCleanName(item.name);
        const lower = clean.toLowerCase();
        if (clean && !seen.has(lower) && !dismissedNames.has(lower)) {
          seen.add(lower);
          list.push({
            id: `item_hist_${item.id}`,
            deviceName: device.name,
            cleanName: clean,
            category: item.category || 'Other',
            lastUnit: item.unit,
            lastCompletedAt: item.createdAt,
            purchaseCount: 1,
          });
        }
      }
    }

    return list;
  }, [deviceItemHistory, items, device.name, activeHouseholdDevices, dismissedNames]);

  const hasZeroHistory = scopedHistory.length === 0;

  // Matching typeahead items based on typed input text (deduplicated by cleanName)
  const typeaheadMatches = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return [];
    
    const seen = new Set<string>();
    const matches: DeviceItemHistory[] = [];

    for (const h of scopedHistory) {
      const lower = h.cleanName.toLowerCase();
      if (lower.includes(query) && !seen.has(lower)) {
        seen.add(lower);
        matches.push(h);
        if (matches.length >= 6) break;
      }
    }
    return matches;
  }, [scopedHistory, inputText]);

  // Reset selected keyboard index when matches change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [typeaheadMatches]);

  const handleSelectTypeaheadItem = async (item: DeviceItemHistory) => {
    await addItem(
      item.cleanName,
      1,
      item.lastUnit,
      item.category || 'Other',
      undefined,
      activeList?.id
    );
    setInputText('');
    setNote('');
    setIsQuickAddOptionsOpen(false);
    setIsCategoryCustomized(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const handleRemoveTypeaheadItem = async (e: React.MouseEvent, item: DeviceItemHistory) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissedNames((prev) => new Set(prev).add(item.cleanName.toLowerCase()));
    if (!item.id.startsWith('item_hist_')) {
      await removeDeviceHistoryItem(item.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isInputFocused || typeaheadMatches.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < typeaheadMatches.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : typeaheadMatches.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < typeaheadMatches.length) {
      e.preventDefault();
      handleSelectTypeaheadItem(typeaheadMatches[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsInputFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      const parsed = parseItemInput(val, autoListRules);
      if (!isCategoryCustomized) {
        setCategory(parsed.category);
      }
    }
  };

  const parsedPreview = inputText.trim() ? parseItemInput(inputText, autoListRules) : null;
  const currentCategoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;

  // Matched target list for visual badge
  const matchedTargetList = parsedPreview?.matchedRule
    ? lists.find((l) => l.id === parsedPreview.matchedRule?.targetListId)
    : null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseItemInput(inputText, autoListRules);
    const finalName = parsed.name;
    const finalQty = parsed.quantity;
    const finalUnit = parsed.unit;
    const finalCategory = isCategoryCustomized ? category : parsed.category;
    const targetListId = parsed.matchedRule?.targetListId;

    await addItem(finalName, finalQty, finalUnit, finalCategory, note.trim() || undefined, targetListId);

    // Reset state
    setInputText('');
    setNote('');
    setIsQuickAddOptionsOpen(false);
    setIsCategoryCustomized(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 px-4 py-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.45)] transition-colors">
      <div className="max-w-2xl mx-auto space-y-2">
        {/* Chrome URL-Style Vertical Auto-Complete Dropdown */}
        {isInputFocused && typeaheadMatches.length > 0 && (
          <div
            className="overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-850/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/80 shadow-xl shadow-slate-900/10 dark:shadow-black/40 animate-in fade-in slide-in-from-bottom-2 duration-150 divide-y divide-slate-100 dark:divide-slate-800/80"
            role="listbox"
            aria-label="Item suggestions"
          >
            <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-slate-900/50 flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Suggestions ({device.name})</span>
              <span className="text-[10px] font-normal lowercase tracking-normal text-slate-400">Press Esc to dismiss</span>
            </div>
            {typeaheadMatches.map((item, idx) => {
              const itemCatColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
              const isSelected = selectedIndex === idx;

              // Split text to highlight matching query part
              const query = inputText.trim().toLowerCase();
              const lowerName = item.cleanName.toLowerCase();
              const matchIdx = lowerName.indexOf(query);
              const beforeMatch = matchIdx >= 0 ? item.cleanName.slice(0, matchIdx) : '';
              const matchedStr = matchIdx >= 0 ? item.cleanName.slice(matchIdx, matchIdx + query.length) : item.cleanName;
              const afterMatch = matchIdx >= 0 ? item.cleanName.slice(matchIdx + query.length) : '';

              return (
                <div
                  key={item.id}
                  onMouseDown={(e) => {
                    // Prevent blur so handleSelect executes
                    e.preventDefault();
                    handleSelectTypeaheadItem(item);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`group flex items-center justify-between px-3 py-2 text-sm transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <History className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-emerald-500 shrink-0 transition-colors" />
                    <div className="flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-medium truncate">
                        {beforeMatch}
                        <strong className="text-emerald-600 dark:text-emerald-400 font-bold underline decoration-emerald-400/40">
                          {matchedStr}
                        </strong>
                        {afterMatch}
                      </span>
                      {item.lastUnit && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
                          ({item.lastUnit})
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border shrink-0 hidden sm:inline-flex ${itemCatColor.bg} ${itemCatColor.text} ${itemCatColor.border}`}
                    >
                      {item.category}
                    </span>
                  </div>

                  {/* Chrome-style right-side 'x' button to remove suggestion */}
                  <button
                    type="button"
                    onMouseDown={(e) => handleRemoveTypeaheadItem(e, item)}
                    onClick={(e) => handleRemoveTypeaheadItem(e, item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all shrink-0 ml-2 cursor-pointer active:scale-95"
                    title={`Remove "${item.cleanName}" from suggestions`}
                    aria-label={`Remove "${item.cleanName}" from suggestions`}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.2]" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Optional Expanded Tray for Note / Custom Category */}
        {isQuickAddOptionsOpen && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/70 animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Select */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Category:</span>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as ItemCategory);
                    setIsCategoryCustomized(true);
                  }}
                  className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden cursor-pointer"
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
                  placeholder="Optional note (e.g. brand, aisle)..."
                  className="w-full text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                  maxLength={60}
                />
              </div>

              <button
                type="button"
                onClick={() => setIsQuickAddOptionsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer"
                title="Close options"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Floating Quick-Add Input & Bottom Thumb Controls */}
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          {/* History Clock Button: Opens Replenishment Drawer (disabled if zero history) */}
          <button
            type="button"
            onClick={openReplenishmentDrawer}
            disabled={hasZeroHistory}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
              hasZeroHistory
                ? 'opacity-30 pointer-events-none bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/70 text-slate-400'
                : 'bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/60 border-slate-200/80 dark:border-slate-700/70 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 active:scale-95'
            }`}
            title={hasZeroHistory ? 'No past purchase history for this device' : 'Past Bought Items (Quick Replenish)'}
            aria-label="Past Bought Items"
          >
            <History className="w-4 h-4" />
          </button>

          <div className="relative flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all px-3.5 py-1.5 h-11">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                // Short timeout to allow clicking pill before hiding
                setTimeout(() => setIsInputFocused(false), 200);
              }}
              placeholder={`Add to ${activeList?.name || 'list'} (e.g. "Milk", "Bread")...`}
              className="flex-1 bg-slate-100 dark:bg-slate-800 text-[14px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden pr-2"
            />


            {/* Live NLP Category / Quantity Badges & Auto-List Target Badge */}
            {parsedPreview && (
              <div className="flex items-center gap-1.5 shrink-0 pl-1">
                {matchedTargetList && matchedTargetList.id !== activeList?.id && (
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 animate-in fade-in">
                    <ArrowRight className="w-2.5 h-2.5 stroke-[3]" />
                    <span>{matchedTargetList.name}</span>
                  </span>
                )}
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

            {/* Toggle Note / Custom Category Tray Button */}
            <button
              type="button"
              onClick={() => setIsQuickAddOptionsOpen(!isQuickAddOptionsOpen)}
              className={`ml-1.5 p-1.5 rounded-xl transition-colors shrink-0 cursor-pointer ${
                isQuickAddOptionsOpen || note || isCategoryCustomized
                  ? 'text-emerald-600 bg-emerald-100/80 dark:bg-emerald-950/80'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Add note / change category"
            >
              <SlidersHorizontal className="w-4 h-4" />
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
