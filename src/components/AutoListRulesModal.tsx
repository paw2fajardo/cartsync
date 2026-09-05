import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, ArrowRight, Search, Pencil, Check } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { AutoListRule, ItemCategory } from '../types';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';

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

export const AutoListRulesModal: React.FC = () => {
  const {
    isAutoListRulesModalOpen,
    closeAutoListRulesModal,
    autoListRules,
    lists,
    addAutoListRule,
    updateAutoListRule,
    deleteAutoListRule,
  } = useGrocery();

  // Intercept back button to close auto list rules modal
  useModalBackNavigation(isAutoListRulesModalOpen, closeAutoListRulesModal, 'auto-list-rules-modal');

  // Prevent background scrolling while modal is open
  useBodyScrollLock(isAutoListRulesModalOpen);

  const [searchQuery, setSearchQuery] = useState('');
  const [keyword, setKeyword] = useState('');
  const [targetListId, setTargetListId] = useState<string>(lists[0]?.id || '');
  const [category, setCategory] = useState<ItemCategory>('Bakery');
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editTargetListId, setEditTargetListId] = useState<string>('');
  const [editCategory, setEditCategory] = useState<ItemCategory>('Other');

  // Ensure default targetListId is always initialized once lists are loaded
  React.useEffect(() => {
    if (!targetListId && lists.length > 0) {
      setTargetListId(lists[0].id);
    }
  }, [lists, targetListId]);

  if (!isAutoListRulesModalOpen) return null;

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !targetListId) return;

    await addAutoListRule(keyword.trim(), targetListId, category);
    setKeyword('');
  };

  const handleStartEdit = (rule: AutoListRule) => {
    setEditingRuleId(rule.id);
    setEditTargetListId(rule.targetListId);
    setEditCategory(rule.category || 'Other');
  };

  const handleSaveEdit = async (ruleId: string) => {
    await updateAutoListRule(ruleId, {
      targetListId: editTargetListId,
      category: editCategory,
    });
    setEditingRuleId(null);
  };

  const filteredRules = autoListRules.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const targetList = lists.find((l) => l.id === r.targetListId);
    return (
      r.keyword.toLowerCase().includes(q) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (targetList && targetList.name.toLowerCase().includes(q))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auto-list-rules-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="bg-white dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/90 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 id="auto-list-rules-title" className="text-base font-bold text-slate-900 dark:text-white">
                Auto-List Routing Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Route item keywords automatically to designated shopping lists
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAutoListRulesModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Rule Form */}
        <form onSubmit={handleCreateRule} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Add New Auto-Route Keyword</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Keyword Input */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Item / Brand Keyword
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. Gardenia, Kirkland"
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                required
              />
            </div>

            {/* Target List Dropdown */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Target Shopping List
              </label>
              <select
                value={targetListId || (lists[0]?.id || '')}
                onChange={(e) => setTargetListId(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
              >
                {lists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Override */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-slate-100 font-medium focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!keyword.trim()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Auto-Route Rule</span>
          </button>
        </form>

        {/* Search Rules */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords or lists..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        {/* Existing Rules List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredRules.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
              No matching auto-list routing rules found.
            </div>
          ) : (
            filteredRules.map((rule) => {
              const targetList = lists.find((l) => l.id === rule.targetListId);
              const catStyle = rule.category ? CATEGORY_COLORS[rule.category] : null;
              const isEditing = editingRuleId === rule.id;

              return (
                <div
                  key={rule.id}
                  className="p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 flex items-center justify-between gap-2 shadow-2xs"
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                        "{rule.keyword}"
                      </span>
                      <select
                        value={editTargetListId}
                        onChange={(e) => setEditTargetListId(e.target.value)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        {lists.map((l) => (
                          <option key={l.id} value={l.id}>
                            ➔ {l.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as ItemCategory)}
                        className="text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-slate-900 dark:text-slate-100 font-medium"
                      >
                        {ALL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(rule.id)}
                        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                        title="Save"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingRuleId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white capitalize tracking-tight">
                          "{rule.keyword}"
                        </span>
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md">
                          <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                          <span>{targetList?.name || 'Unknown List'}</span>
                        </div>
                        {rule.category && catStyle && (
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            {rule.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(rule)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                          title="Edit rule"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAutoListRule(rule.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={closeAutoListRulesModal}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
