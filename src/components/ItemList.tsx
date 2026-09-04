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
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeList?.name || 'groceries'}...`}
            className="w-full pl-9 pr-8 py-2 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={() => setShowSearch(false)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Items Rendering */}
      {activeItems.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-3xl bg-white/60 dark:bg-zinc-900/60 border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mx-auto flex items-center justify-center">
            <ShoppingBasket className="w-5 h-5 stroke-[2]" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {totalInList === 0
              ? 'List is empty'
              : searchQuery
              ? 'No matching items'
              : 'All done for this list! 🎉'}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-xs mx-auto">
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
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${catStyle.dot}`} />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                    {category}
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
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
