import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Trash2, Plus, Minus, Edit3, StickyNote, X, ArrowRight, FolderSync } from 'lucide-react';
import { GroceryItem, ItemCategory } from '../types';
import { useGrocery } from '../context/GroceryContext';
import { CATEGORY_COLORS, categorizeItem } from '../utils/smartCategorizer';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';
import { usePullDownDismiss } from '../hooks/usePullDownDismiss';
import { PullDownHandle } from './PullDownHandle';
import { ContributorBadge } from './ContributorBadge';

const AUTO_REORGANIZE_STORAGE_KEY = 'cartsync_auto_reorganize_category_v1';

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

interface GroceryItemCardProps {
  item: GroceryItem;
}

export const GroceryItemCard: React.FC<GroceryItemCardProps> = ({ item }) => {
  const {
    toggleItem,
    updateItem,
    deleteItem,
    incrementItem,
    decrementItem,
    lists,
    autoListRules,
    addAutoListRule,
    activeEditingItemId,
    setActiveEditingItemId,
  } = useGrocery();
  const isInlineEditing = activeEditingItemId === item.id;
  const [editName, setEditName] = useState(item.name);
  const [editQuantity, setEditQuantity] = useState(item.quantity);
  const [editUnit, setEditUnit] = useState(item.unit || '');
  const [editNote, setEditNote] = useState(item.note || '');
  const [editCategory, setEditCategory] = useState<ItemCategory>(item.category);
  const [editListId, setEditListId] = useState<string>(item.listId);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Category suggestion prompt state
  const [categorySuggestionPrompt, setCategorySuggestionPrompt] = useState<{
    trimmedName: string;
    suggestedCategory: ItemCategory;
  } | null>(null);
  const [alwaysAutoMove, setAlwaysAutoMove] = useState(false);

  // Intercept back button to dismiss item edit sheet, quick dropdown, or prompt
  useModalBackNavigation(isInlineEditing, () => setActiveEditingItemId(null), `item-edit-${item.id}`);
  useModalBackNavigation(isCategoryDropdownOpen, () => setIsCategoryDropdownOpen(false), `item-cat-${item.id}`);
  useModalBackNavigation(Boolean(categorySuggestionPrompt), () => setCategorySuggestionPrompt(null), `item-prompt-${item.id}`);

  // Lock canvas scroll whenever edit modal or quick category bottom sheet is open
  useBodyScrollLock(isInlineEditing || isCategoryDropdownOpen || Boolean(categorySuggestionPrompt));

  const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Pull-down-to-dismiss for Edit Modal
  const editModalDismiss = usePullDownDismiss({
    onDismiss: () => setActiveEditingItemId(null),
    enabled: isInlineEditing,
  });

  // Pull-down-to-dismiss for Category Switcher
  const categoryDismiss = usePullDownDismiss({
    onDismiss: () => setIsCategoryDropdownOpen(false),
    enabled: isCategoryDropdownOpen,
  });

  // Detect virtual keyboard presence via visualViewport resizing
  React.useEffect(() => {
    if (!isInlineEditing || typeof window === 'undefined') return;

    const handleResize = () => {
      if (window.visualViewport) {
        // If the visual viewport is significantly smaller than the window height (>= 150px difference), keyboard is open
        const isKeyboard = window.innerHeight - window.visualViewport.height > 150;
        setIsKeyboardOpen(isKeyboard);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isInlineEditing]);

  // Intercept Escape key when category popup is open
  React.useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen]);

  const commitItemSave = (finalCategory: ItemCategory) => {
    const trimmedName = editName.trim();
    if (!trimmedName) return;

    updateItem(item.id, {
      name: trimmedName,
      quantity: Math.max(1, editQuantity),
      unit: editUnit.trim() || undefined,
      note: editNote.trim() || undefined,
      category: finalCategory,
      listId: editListId,
    });

    if (finalCategory !== 'Other' || editListId !== item.listId) {
      addAutoListRule(trimmedName, editListId, finalCategory);
    }

    setCategorySuggestionPrompt(null);
    setActiveEditingItemId(null);
  };

  const handleSaveInlineEdit = () => {
    if (!editName.trim()) {
      setActiveEditingItemId(null);
      return;
    }

    const trimmedName = editName.trim();
    const isNameChanged = trimmedName.toLowerCase() !== item.name.toLowerCase();
    const isCategoryUntouchedByUser = editCategory === item.category;

    // Check if the corrected name maps to a known category different from current
    if (isNameChanged && isCategoryUntouchedByUser) {
      const suggestedCategory = categorizeItem(trimmedName, autoListRules);
      if (suggestedCategory !== 'Other' && suggestedCategory !== item.category) {
        const isAutoMoveEnabled = typeof window !== 'undefined' && localStorage.getItem(AUTO_REORGANIZE_STORAGE_KEY) === 'true';
        if (isAutoMoveEnabled) {
          // Device has opted into always auto-moving
          commitItemSave(suggestedCategory);
          return;
        }

        // Show prompt to ask user
        setCategorySuggestionPrompt({
          trimmedName,
          suggestedCategory,
        });
        return;
      }
    }

    commitItemSave(editCategory);
  };

  const handleConfirmCategoryMove = (shouldMove: boolean) => {
    if (!categorySuggestionPrompt) return;

    if (alwaysAutoMove && typeof window !== 'undefined') {
      localStorage.setItem(AUTO_REORGANIZE_STORAGE_KEY, 'true');
    }

    const finalCat = shouldMove ? categorySuggestionPrompt.suggestedCategory : editCategory;
    commitItemSave(finalCat);
  };

  const handleQuickCategoryChange = (newCat: ItemCategory) => {
    updateItem(item.id, { category: newCat });
    setIsCategoryDropdownOpen(false);

    // If changing category (e.g. from Other to Personal Care), auto-add rule for item name
    if (newCat !== 'Other') {
      addAutoListRule(item.name, item.listId, newCat);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveInlineEdit();
    if (e.key === 'Escape') setActiveEditingItemId(null);
  };

  const openEditModal = () => {
    setEditName(item.name);
    setEditQuantity(item.quantity);
    setEditUnit(item.unit || '');
    setEditNote(item.note || '');
    setEditCategory(item.category);
    setEditListId(item.listId);
    setActiveEditingItemId(item.id);
  };

  return (
    <div className="relative group">
      {/* Foreground Card Surface */}
      <div
        className={`relative z-10 rounded-2xl sm:rounded-3xl border transition-all duration-200 ${
          item.completed
            ? 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 opacity-60'
            : 'bg-white dark:bg-slate-800 border-slate-200/90 dark:border-slate-700/80 hover:border-emerald-500/50 dark:hover:border-slate-600 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.55)]'
        }`}
      >
        <div className="py-2.5 px-3 sm:py-3 sm:px-4 flex items-center gap-3">
          {/* Compact Round Checkbox with ergonomic touch zone */}
          <button
            type="button"
            onClick={() => toggleItem(item.id)}
            className="w-8 h-8 -my-1 -ml-1 flex items-center justify-center shrink-0 cursor-pointer group/cb"
            title={item.completed ? 'Mark as active' : 'Mark as completed'}
            aria-label={item.completed ? 'Mark as active' : 'Mark as completed'}
          >
            <span
              className={`w-[20px] h-[20px] rounded-full flex items-center justify-center border transition-all duration-200 group-active/cb:scale-90 ${
                item.completed
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs'
                  : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 group-hover/cb:border-emerald-500 group-hover/cb:bg-emerald-50/50 dark:group-hover/cb:bg-emerald-950/30 text-transparent'
              }`}
            >
              <Check
                className={`w-3 h-3 stroke-[3] transition-all duration-150 ${
                  item.completed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              />
            </span>
          </button>

          {/* Content Area: Tap to open Edit Bottom Sheet / Modal */}
          <div
            className="flex-1 min-w-0 cursor-pointer select-none"
            onClick={openEditModal}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              {/* Left Column: Name + Badges + Note + Sub-attribution */}
              <div className="min-w-0 flex-1 pr-1">
                {/* Main line: Item Name + Quantity Badge + Category Pill */}
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span
                    className={`text-[14px] sm:text-[15px] font-semibold tracking-tight transition-colors truncate max-w-[200px] sm:max-w-none ${
                      item.completed
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-900 dark:text-slate-100 hover:text-emerald-700 dark:hover:text-emerald-400'
                    }`}
                  >
                    {item.name}
                  </span>

                  {/* Quantity Badge */}
                  {(item.quantity > 1 || item.unit) && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        item.completed
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200/50 dark:border-slate-700/50'
                          : 'bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
                      }`}
                    >
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}

                  {/* Clickable Category Pill */}
                  <div
                    className="relative shrink-0"
                    onClick={(e) => {
                      // Prevent triggering the edit modal when tapping category pill
                      e.stopPropagation();
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className={`text-[9.5px] font-medium px-1.5 py-0.2 rounded border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                        item.completed ? 'opacity-40' : 'opacity-85 hover:opacity-100 shadow-2xs'
                      } ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                      title="Click to change category"
                    >
                      {item.category}
                    </button>

                    {/* Category Quick Switcher Bottom Sheet / Modal */}
                    {isCategoryDropdownOpen &&
                      typeof document !== 'undefined' &&
                      createPortal(
                        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
                          {/* Backdrop */}
                          <div
                            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
                            style={categoryDismiss.backdropStyle}
                            onClick={() => setIsCategoryDropdownOpen(false)}
                          />

                          {/* Slide-Up Bottom Sheet on Mobile, Centered Card on Desktop */}
                          <div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Change Category"
                            {...categoryDismiss.containerProps}
                            className="relative z-10 w-full max-w-lg sm:max-w-sm bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 pb-safe overscroll-contain"
                          >
                            {/* Mobile Pull Handle */}
                            <PullDownHandle
                              onPointerDown={categoryDismiss.handlePointerDown}
                              isDragging={categoryDismiss.isDragging}
                              showCue={false}
                            />

                            {/* Header */}
                            <div
                              {...categoryDismiss.headerProps}
                              className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none"
                            >
                              <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                  Change Category
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[240px]">
                                  for <span className="font-semibold text-slate-700 dark:text-slate-300">"{item.name}"</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsCategoryDropdownOpen(false)}
                                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Category List */}
                            <div className="p-3 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto space-y-1">
                              {ALL_CATEGORIES.map((cat) => {
                                const style = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                                const isSelected = item.category === cat;
                                return (
                                  <button
                                    key={cat}
                                    type="button"
                                    onClick={() => handleQuickCategoryChange(cat)}
                                    className={`w-full text-left px-3.5 py-3 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-medium flex items-center justify-between transition-all cursor-pointer active:scale-[0.98] ${
                                      isSelected
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className={`w-2.5 h-2.5 rounded-full ${style.dot} ring-2 ring-white dark:ring-slate-900`} />
                                      <span>{cat}</span>
                                    </div>
                                    {isSelected && (
                                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-xs">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>,
                        document.body
                      )}
                  </div>
                </div>

                {/* Sub-line: Note (if any) + multi-device contributor badge */}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {/* Note if available */}
                  {item.note && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 max-w-[130px] sm:max-w-[200px] truncate">
                      <StickyNote className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      <span className="italic truncate">{item.note}</span>
                    </div>
                  )}

                  {/* Multi-Device Contributor Badge with stack breakdown popover */}
                  <ContributorBadge item={item} />
                </div>
              </div>

              {/* Right Column: Fast Stepper & Desktop Hover Delete */}
              <div
                className="flex items-center gap-1 shrink-0"
                onClick={(e) => {
                  // Prevent opening edit modal when clicking +/- buttons
                  e.stopPropagation();
                }}
              >
                {!item.completed && (
                  <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-850 p-0.5 rounded-xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => decrementItem(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white hover:bg-white dark:hover:bg-slate-750 active:scale-90 transition-all cursor-pointer"
                      title="Decrease quantity"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    {item.quantity > 1 && (
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 px-1 select-none">
                        {item.quantity}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => incrementItem(item.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white hover:bg-white dark:hover:bg-slate-750 active:scale-90 transition-all cursor-pointer"
                      title="Increase quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                )}

                {/* Desktop hover delete button (hidden on touch, smooth reveal on pointer devices) */}
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="hidden sm:flex opacity-0 group-hover:opacity-100 w-7 h-7 ml-0.5 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 active:scale-90 transition-all cursor-pointer"
                  title="Delete item"
                  aria-label="Delete item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal Dialog (Rendered via React Portal at Body Root Layer) */}
      {isInlineEditing &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
              style={editModalDismiss.backdropStyle}
              onClick={() => setActiveEditingItemId(null)}
            />

            {/* Modal Card / Bottom Sheet: Adaptive height (compact auto-fit when keyboard closed, 90% when keyboard open) */}
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Edit Item"
              {...editModalDismiss.containerProps}
              style={{
                ...editModalDismiss.containerProps.style,
                transition: editModalDismiss.isDragging
                  ? 'none'
                  : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), height 0.25s cubic-bezier(0.2, 0.8, 0.2, 1), max-height 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
              className={`relative z-10 w-full ${
                isKeyboardOpen ? 'h-[90dvh]' : 'h-auto max-h-[85dvh]'
              } sm:h-auto sm:max-h-[90vh] max-w-lg sm:max-w-md bg-white dark:bg-slate-850 border-t sm:border border-slate-200 dark:border-slate-700/90 rounded-t-3xl sm:rounded-3xl shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overscroll-contain pb-safe`}
            >
              {/* Mobile Pull Handle with visual drag cue */}
              <PullDownHandle
                onPointerDown={editModalDismiss.handlePointerDown}
                isDragging={editModalDismiss.isDragging}
                showCue={true}
              />

              {/* Header */}
              <div
                {...editModalDismiss.headerProps}
                className="flex items-center justify-between px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Edit Item
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Update details for "{item.name}"
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveEditingItemId(null)}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Close edit modal"
                  aria-label="Close edit modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content - Scrollable area */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveInlineEdit();
                }}
                className="flex-1 overflow-y-auto p-5 space-y-4 pb-safe flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Item Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Item Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Item name"
                      className="w-full text-sm font-medium px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      required
                    />
                  </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Shopping List Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Shopping List
                    </label>
                    <select
                      value={editListId}
                      onChange={(e) => setEditListId(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {lists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Category
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as ItemCategory)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:border-emerald-500 cursor-pointer"
                    >
                      {ALL_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quantity & Unit Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Quantity
                    </label>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setEditQuantity((q) => Math.max(1, q - 1))}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-90 transition-all cursor-pointer shadow-2xs font-bold"
                        title="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center text-xs font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setEditQuantity((q) => q + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-90 transition-all cursor-pointer shadow-2xs font-bold"
                        title="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Unit (optional)
                    </label>
                    <input
                      type="text"
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="e.g. lbs, gal, pack"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-hidden focus:border-emerald-500"
                      maxLength={15}
                    />
                  </div>
                </div>

                {/* Optional Note */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Note (optional)
                  </label>
                  <input
                    type="text"
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. brand, aisle, quantity details..."
                    className="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500"
                    maxLength={100}
                  />
                </div>
              </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-auto border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      deleteItem(item.id);
                      setActiveEditingItemId(null);
                    }}
                    className="px-3.5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveEditingItemId(null)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Category Auto-Move Suggestion Confirmation Dialog */}
      {categorySuggestionPrompt &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/75 dark:bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-slate-900 dark:text-white">
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0 shadow-xs">
                  <FolderSync className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">
                    Move to {categorySuggestionPrompt.suggestedCategory}?
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Category match detected for corrected name
                  </p>
                </div>
              </div>

              {/* Description Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-slate-600 dark:text-slate-300">
                    <strong>"{categorySuggestionPrompt.trimmedName}"</strong>
                  </span>
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.category}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {categorySuggestionPrompt.suggestedCategory}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Would you like to automatically organize this item into <strong>{categorySuggestionPrompt.suggestedCategory}</strong>?
                </p>
              </div>

              {/* Per-Device Remember Preference Checkbox */}
              <label className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-all select-none">
                <input
                  type="checkbox"
                  checked={alwaysAutoMove}
                  onChange={(e) => setAlwaysAutoMove(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded-md text-emerald-600 focus:ring-emerald-500/20 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-pointer"
                />
                <div className="text-[11px] leading-tight">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Always auto-move on this device
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">
                    Automatically re-categorize future spelling corrections without asking.
                  </span>
                </div>
              </label>

              {/* Dialog Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleConfirmCategoryMove(false)}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Keep as {item.category}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmCategoryMove(true)}
                  className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Move to {categorySuggestionPrompt.suggestedCategory}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
