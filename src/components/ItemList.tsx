import React, { useState } from 'react';
import { Search, ShoppingBasket, X } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryItemCard } from './GroceryItemCard';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { ItemCategory } from '../types';

export const ItemList: React.FC = () => {
  const { activeItems, searchQuery, setSearchQuery, activeList, items } = useGrocery();
  const [showSearch, setShowSearch] = useState(false);

  // Group active items by category
  const groupedItems = activeItems.reduce<Record<string, typeof activeItems>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalInList = items.filter((i) => i.listId === activeList?.id).length;

  return (
    <div className="space-y-4 pb-24">
      {/* Optional Search Bar (toggled or shown if searching) */}
      {(showSearch || searchQuery || activeItems.length > 8) && (
        <div className="relative animate-in fade-in duration-150">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeList?.name || 'groceries'}...`}
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
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
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, catItems]) => {
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
