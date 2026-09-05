import React, { useState } from 'react';
import { Search, ShoppingBasket, X, ArrowDownAZ, Layers } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryItemCard } from './GroceryItemCard';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { ItemCategory } from '../types';

export const ItemList: React.FC = () => {
  const {
    activeItems,
    searchQuery,
    setSearchQuery,
    activeList,
    items,
  } = useGrocery();
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'category' | 'alpha'>('alpha');

  // Standard grocery aisle order
  const aisleOrder: ItemCategory[] = [
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

  // Memoize grouped items and sort categories/items immutably
  const { groupedItems, sortedCategories } = React.useMemo(() => {
    const grouped = activeItems.reduce<Record<string, typeof activeItems>>((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const sortedCats = Object.keys(grouped).sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      }
      const idxA = aisleOrder.indexOf(a as ItemCategory);
      const idxB = aisleOrder.indexOf(b as ItemCategory);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

    const sortedGrouped: Record<string, typeof activeItems> = {};
    for (const cat of sortedCats) {
      sortedGrouped[cat] = [...grouped[cat]].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }

    return { groupedItems: sortedGrouped, sortedCategories: sortedCats };
  }, [activeItems, sortBy]);

  const totalInList = items.filter((i) => i.listId === activeList?.id).length;

  return (
    <div className="space-y-3 pb-24">
      {/* Sticky Top Pane: List Name / Active Count & Toolbar (Freezes below header on scroll) */}
      <div className="sticky top-14 z-20 -mx-4 px-4 py-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 shadow-xs space-y-2">
        {/* Header Toolbar: Quick Sort Toggle & Active Counter */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {activeList?.name || 'Items'}
            </span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {activeItems.length} active
            </span>
          </div>

          {/* Quick Sort (Category vs A-Z) Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/80 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setSortBy('category')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'category'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Group items by grocery category"
              >
                <Layers className="w-3 h-3" />
                <span>Category</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('alpha')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'alpha'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Sort items alphabetically A to Z"
              >
                <ArrowDownAZ className="w-3.5 h-3.5" />
                <span>A–Z</span>
              </button>
            </div>
          </div>
        </div>

        {/* Optional Search Bar */}
        {(showSearch || searchQuery || activeItems.length > 8) && (
          <div className="relative animate-in fade-in duration-150">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeList?.name || 'groceries'} (names, notes)...`}
              className="w-full pl-9 pr-8 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowSearch(false)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Items Rendering */}
      {activeItems.length === 0 ? (
        <div className="py-14 px-4 text-center rounded-3xl bg-white/60 dark:bg-slate-800/40 border border-dashed border-slate-200/80 dark:border-slate-700/70 backdrop-blur-xs space-y-2.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500 mx-auto flex items-center justify-center shadow-2xs">
            <ShoppingBasket className="w-5 h-5 stroke-[2]" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {totalInList === 0
              ? 'List is empty'
              : searchQuery
              ? 'No matching items'
              : 'All done for this list! 🎉'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
            {totalInList === 0
              ? 'Use the bottom bar to quickly add your grocery items.'
              : searchQuery
              ? 'Check the spelling or clear search filter.'
              : 'Everything has been gathered and checked off.'}
          </p>
        </div>
      ) : (
        /* Sorted Category Groups */
        <div className="space-y-4">
          {sortedCategories.map((category) => {
            const catItems = groupedItems[category] || [];
            const catStyle = CATEGORY_COLORS[category as ItemCategory] || CATEGORY_COLORS.Other;
            return (
              <div key={category} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {category}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    ({catItems.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {catItems.map((item) => (
                    <GroceryItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
