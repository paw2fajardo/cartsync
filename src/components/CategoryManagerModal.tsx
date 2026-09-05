import React, { useState } from 'react';
import { X, Layers, Sparkles, Search, Tag, ArrowRight, Plus, Trash2, Check, Pencil } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { ItemCategory } from '../types';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';

export const INITIAL_CATEGORIES_INFO: Array<{
  name: ItemCategory;
  description: string;
  defaultKeywords: string[];
}> = [
  {
    name: 'Produce',
    description: 'Fresh fruits, vegetables, salad greens, roots & fresh herbs',
    defaultKeywords: ['apple', 'banana', 'tomato', 'potato', 'onion', 'garlic', 'spinach', 'avocado', 'lemon', 'carrot'],
  },
  {
    name: 'Dairy & Eggs',
    description: 'Milk, cheeses, butter, yogurts, creams & eggs',
    defaultKeywords: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'eggs', 'cheddar', 'parmesan'],
  },
  {
    name: 'Bakery',
    description: 'Bread, bagels, buns, croissants, baguettes & tortillas',
    defaultKeywords: ['bread', 'bagel', 'croissant', 'sourdough', 'tortilla', 'bun', 'muffin', 'gardenia'],
  },
  {
    name: 'Meat & Seafood',
    description: 'Poultry, beef, pork, bacon, fish, salmon & fresh seafood',
    defaultKeywords: ['chicken', 'beef', 'steak', 'pork', 'bacon', 'sausage', 'salmon', 'tuna', 'shrimp'],
  },
  {
    name: 'Pantry',
    description: 'Rice, pasta, grains, canned items, oils, spices & sauces',
    defaultKeywords: ['rice', 'pasta', 'olive oil', 'flour', 'sugar', 'beans', 'sauce', 'spices', 'oats'],
  },
  {
    name: 'Frozen',
    description: 'Ice cream, frozen vegetables, frozen meals & pizzas',
    defaultKeywords: ['frozen', 'ice cream', 'frozen pizza', 'frozen peas', 'waffles', 'dumplings'],
  },
  {
    name: 'Snacks & Sweets',
    description: 'Chips, crackers, nuts, chocolates, cookies & bars',
    defaultKeywords: ['chips', 'chocolate', 'popcorn', 'pretzels', 'cookies', 'candy', 'nuts', 'crackers'],
  },
  {
    name: 'Beverages',
    description: 'Coffee, teas, sparkling water, juices, sodas & wine',
    defaultKeywords: ['coffee', 'tea', 'juice', 'soda', 'water', 'sparkling water', 'beer', 'wine'],
  },
  {
    name: 'Household & Cleaning',
    description: 'Paper towels, detergents, trash bags, dish soap & cleaners',
    defaultKeywords: ['paper towels', 'toilet paper', 'dish soap', 'trash bags', 'laundry detergent', 'sponges'],
  },
  {
    name: 'Pharmacy & Health',
    description: 'Vitamins, pain relievers, first aid, medicines & remedies',
    defaultKeywords: ['tylenol', 'advil', 'ibuprofen', 'vitamins', 'bandaids', 'medicine', 'allergy'],
  },
  {
    name: 'Personal Care',
    description: 'Facial wash, shampoos, soaps, deodorant, skincare & hygiene',
    defaultKeywords: ['facial wash', 'cleanser', 'shampoo', 'conditioner', 'body wash', 'soap', 'deodorant', 'lotion'],
  },
  {
    name: 'Baby Care',
    description: 'Diapers, baby wipes, formula, baby food & infant care',
    defaultKeywords: ['diapers', 'baby wipes', 'baby food', 'formula', 'baby lotion', 'baby shampoo', 'pacifier'],
  },
  {
    name: 'Pet Care',
    description: 'Dog food, cat food, treats, litter, toys & pet supplies',
    defaultKeywords: ['dog food', 'cat food', 'dog treats', 'cat treats', 'cat litter', 'pet treats', 'dog chew'],
  },
  {
    name: 'Other',
    description: 'General miscellaneous household items and hardware',
    defaultKeywords: ['batteries', 'lightbulb', 'stationery', 'hardware'],
  },
];

const LS_CATEGORY_OVERRIDES_KEY = 'cartsync_custom_categories_v1';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose }) => {
  const {
    autoListRules,
    addAutoListRule,
    updateAutoListRule,
    deleteAutoListRule,
    lists,
    items,
  } = useGrocery();

  const [categoriesInfo, setCategoriesInfo] = useState(INITIAL_CATEGORIES_INFO);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('Produce');

  // Intercept back button to close category manager modal
  useModalBackNavigation(isOpen, onClose, 'category-manager-modal');

  // Prevent background scrolling while modal is open
  useBodyScrollLock(isOpen);

  // Interactive Management State
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [targetListForNewKeyword, setTargetListForNewKeyword] = useState<string>(lists[0]?.id || '');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [customDescription, setCustomDescription] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleKeyword, setEditRuleKeyword] = useState('');
  const [editRuleListId, setEditRuleListId] = useState('');

  // Load custom keyword additions / description overrides from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_CATEGORY_OVERRIDES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCategoriesInfo((prev) =>
          prev.map((c) => {
            const override = parsed[c.name];
            if (override) {
              return {
                ...c,
                description: override.description || c.description,
                defaultKeywords: Array.from(
                  new Set([...c.defaultKeywords, ...(override.addedKeywords || [])])
                ),
              };
            }
            return c;
          })
        );
      }
    } catch (_) {}
  }, []);

  // Update target list when lists load
  React.useEffect(() => {
    if (!targetListForNewKeyword && lists.length > 0) {
      setTargetListForNewKeyword(lists[0].id);
    }
  }, [lists, targetListForNewKeyword]);

  // Ref map for category buttons to auto-scroll into center on mobile
  const categoryButtonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  // Auto-scroll selected category into center of mobile scroll container
  React.useEffect(() => {
    if (!isOpen) return;
    const btn = categoryButtonRefs.current.get(selectedCategory);
    if (btn) {
      btn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [selectedCategory, isOpen]);

  // Intercept Escape key when modal is open
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const saveOverridesToStorage = (updatedList: typeof categoriesInfo) => {
    try {
      const map: Record<string, { description?: string; addedKeywords?: string[] }> = {};
      updatedList.forEach((c) => {
        const initial = INITIAL_CATEGORIES_INFO.find((i) => i.name === c.name);
        const added = c.defaultKeywords.filter((k) => !initial?.defaultKeywords.includes(k));
        const descChanged = initial && initial.description !== c.description;
        if (added.length > 0 || descChanged) {
          map[c.name] = {
            description: descChanged ? c.description : undefined,
            addedKeywords: added.length > 0 ? added : undefined,
          };
        }
      });
      localStorage.setItem(LS_CATEGORY_OVERRIDES_KEY, JSON.stringify(map));
    } catch (_) {}
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeywordInput.trim().toLowerCase();
    if (!clean) return;

    // 1. Add keyword to the active category info in state & storage
    const updated = categoriesInfo.map((c) => {
      if (c.name === selectedCategory) {
        if (!c.defaultKeywords.map((k) => k.toLowerCase()).includes(clean)) {
          return {
            ...c,
            defaultKeywords: [...c.defaultKeywords, clean],
          };
        }
      }
      return c;
    });
    setCategoriesInfo(updated);
    saveOverridesToStorage(updated);

    // 2. Also register an auto-route rule if target list is selected
    if (targetListForNewKeyword) {
      await addAutoListRule(clean, targetListForNewKeyword, selectedCategory);
    }

    setNewKeywordInput('');
  };

  const handleDeleteKeyword = async (kw: string) => {
    const clean = kw.toLowerCase();
    // 1. Remove from category keywords list
    const updated = categoriesInfo.map((c) => {
      if (c.name === selectedCategory) {
        return {
          ...c,
          defaultKeywords: c.defaultKeywords.filter((k) => k.toLowerCase() !== clean),
        };
      }
      return c;
    });
    setCategoriesInfo(updated);
    saveOverridesToStorage(updated);

    // 2. Also delete any matching autoListRule with this keyword
    const matchingRule = autoListRules.find(
      (r) => r.keyword.toLowerCase() === clean && r.category === selectedCategory
    );
    if (matchingRule) {
      await deleteAutoListRule(matchingRule.id);
    }
  };

  const handleSaveDescription = () => {
    if (!customDescription.trim()) return;
    const updated = categoriesInfo.map((c) => {
      if (c.name === selectedCategory) {
        return { ...c, description: customDescription.trim() };
      }
      return c;
    });
    setCategoriesInfo(updated);
    saveOverridesToStorage(updated);
    setIsEditingDescription(false);
  };

  const handleSaveEditRule = async (ruleId: string) => {
    if (!editRuleKeyword.trim()) return;
    await updateAutoListRule(ruleId, {
      keyword: editRuleKeyword.trim(),
      targetListId: editRuleListId || lists[0]?.id,
    });
    setEditingRuleId(null);
  };

  const filteredCategories = categoriesInfo.filter((cat) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.defaultKeywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  const activeCategoryInfo =
    categoriesInfo.find((c) => c.name === selectedCategory) || categoriesInfo[0];
  const activeStyle = CATEGORY_COLORS[activeCategoryInfo.name] || CATEGORY_COLORS.Other;

  // Find custom auto-route rules specifically assigned to this category
  const categoryRules = autoListRules.filter((r) => r.category === activeCategoryInfo.name);
  const itemCount = items.filter((i) => i.category === activeCategoryInfo.name).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/90 rounded-3xl max-w-3xl w-full h-[90vh] max-h-[740px] shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden pb-safe">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Category Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add keywords, customize categories & configure auto-routing rules
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Responsive Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Category Selection Column */}
          <div className="w-full md:w-5/12 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/40 shrink-0 md:shrink md:min-h-0">
            {/* Search Categories */}
            <div className="p-2.5 sm:p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter categories..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Category Selector List */}
            <div className="flex md:flex-col overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-2 gap-1.5 md:gap-1 max-h-14 md:max-h-none shrink-0 md:flex-1 no-scrollbar touch-pan-x md:touch-pan-y">
              {filteredCategories.map((cat) => {
                const style = CATEGORY_COLORS[cat.name] || CATEGORY_COLORS.Other;
                const isSelected = selectedCategory === cat.name;
                const count = items.filter((i) => i.category === cat.name).length;

                return (
                  <button
                    key={cat.name}
                    ref={(el) => {
                      if (el) categoryButtonRefs.current.set(cat.name, el);
                      else categoryButtonRefs.current.delete(cat.name);
                    }}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`shrink-0 md:shrink md:w-full text-left px-3 py-1.5 md:py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer whitespace-nowrap md:whitespace-normal scroll-mx-6 ${
                      isSelected
                        ? 'bg-emerald-500 text-white md:bg-white md:dark:bg-slate-800 md:text-slate-900 md:dark:text-white font-bold shadow-xs md:border md:border-slate-200/80 md:dark:border-slate-700'
                        : 'text-slate-600 dark:text-slate-400 bg-white/70 dark:bg-slate-800/50 md:bg-transparent md:dark:bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-white md:' + style.dot : style.dot
                        } shrink-0`}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 md:py-0.5 rounded-md font-semibold ${
                          isSelected
                            ? 'bg-emerald-600 text-white md:bg-slate-200/60 md:dark:bg-slate-700 md:text-slate-600 md:dark:text-slate-300'
                            : 'bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Full Management Canvas */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-white dark:bg-slate-900 touch-pan-y">
            {/* Category Header & Editable Description */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-750 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-lg border ${activeStyle.bg} ${activeStyle.text} ${activeStyle.border}`}
                  >
                    {activeCategoryInfo.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {itemCount} active item{itemCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {!isEditingDescription ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingDescription(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Edit category description"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                      title="Save description"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {isEditingDescription ? (
                <div className="space-y-1.5 pt-1">
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    rows={2}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-emerald-500"
                    placeholder="Enter description for this category..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeCategoryInfo.description}
                </p>
              )}
            </div>

            {/* Section 1: Add New Keyword Form (Clean responsive layout: input on line 1, route selector & Add button on line 2) */}
            <form onSubmit={handleAddKeyword} className="space-y-2.5 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Keyword to "{activeCategoryInfo.name}"</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="e.g. dragonfruit, kombucha, almond milk..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 shadow-2xs"
                />

                <div className="flex items-center gap-2">
                  <select
                    value={targetListForNewKeyword}
                    onChange={(e) => setTargetListForNewKeyword(e.target.value)}
                    className="flex-1 text-xs px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden cursor-pointer shadow-2xs min-w-0"
                    title="Target shopping list for quick routing"
                  >
                    {lists.map((l) => (
                      <option key={l.id} value={l.id}>
                        Route to: {l.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    disabled={!newKeywordInput.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Section 2: Recognized Keywords with Deletion Support */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-500" />
                  Recognized Keywords ({activeCategoryInfo.defaultKeywords.length})
                </h3>
                <span className="text-[10px] text-slate-400">Click &times; to remove</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1">
                {activeCategoryInfo.defaultKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/80 text-[11px] font-medium text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteKeyword(kw)}
                      className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                      title={`Remove "${kw}"`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Section 3: Learned Auto-Route Rules for This Category */}
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Auto-Routing Rules ({categoryRules.length})
                </h3>
              </div>

              {categoryRules.length === 0 ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No custom list-routing rules assigned to {activeCategoryInfo.name}.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Add a keyword above or change an item's category to create auto-rules!
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {categoryRules.map((rule) => {
                    const isEditing = editingRuleId === rule.id;
                    const targetList = lists.find((l) => l.id === rule.targetListId);

                    return (
                      <div
                        key={rule.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/70 flex items-center justify-between text-xs gap-2"
                      >
                        {isEditing ? (
                          <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="text"
                              value={editRuleKeyword}
                              onChange={(e) => setEditRuleKeyword(e.target.value)}
                              className="w-full sm:w-1/2 text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            />
                            <select
                              value={editRuleListId}
                              onChange={(e) => setEditRuleListId(e.target.value)}
                              className="w-full sm:w-1/2 text-xs px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 cursor-pointer"
                            >
                              {lists.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSaveEditRule(rule.id)}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 cursor-pointer"
                                title="Save rule"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRuleId(null)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                "{rule.keyword}"
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                                {targetList?.name || 'Supermarket'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingRuleId(rule.id);
                                  setEditRuleKeyword(rule.keyword);
                                  setEditRuleListId(rule.targetListId);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
                                title="Edit rule"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAutoListRule(rule.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete rule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
