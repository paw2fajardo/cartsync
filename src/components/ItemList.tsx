import React, { useState } from 'react';
import { Search, Layers, ListFilter, ShoppingBasket } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryItemCard } from './GroceryItemCard';
import { ItemCategory } from '../types';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';

const CATEGORIES: (ItemCategory | 'All')[] = [
  'All',
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
  'Other',
];

export const ItemList: React.FC = () => {
  const {
    activeItems,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activeList,
    items,
  } = useGrocery();

  const [groupByAisle, setGroupByAisle] = useState(true);

  // Group active items by category
  const groupedItems = activeItems.reduce<Record<string, typeof activeItems>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const totalInList = items.filter((i) => i.listId === activeList?.id).length;

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeList?.name || 'items'}...`}
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-xs sm:text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-hidden focus:border-emerald-500 transition-colors shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Group By Aisle toggle */}
        <button
          type="button"
          onClick={() => setGroupByAisle(!groupByAisle)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium border transition-colors shrink-0 ${
            groupByAisle
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200/90 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
          title="Toggle Aisle / Category Grouping"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{groupByAisle ? 'Grouped by Aisle' : 'Flat List'}</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <ListFilter className="w-3.5 h-3.5 text-zinc-400 ml-1 shrink-0" />
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold shadow-xs'
                  : 'bg-white dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 border border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Items Rendering */}
      {activeItems.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mx-auto flex items-center justify-center">
            <ShoppingBasket className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-bold text-zinc-800 dark:text-zinc-200">
              {totalInList === 0
                ? 'Your list is empty'
                : searchQuery || selectedCategory !== 'All'
                ? 'No matching items found'
                : 'All items completed! 🎉'}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto">
              {totalInList === 0
                ? 'Add your first grocery item above or tap any of the pantry staples chips.'
                : searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or category filter.'
                : 'Great job! Everything for this shopping trip has been gathered.'}
            </p>
          </div>
        </div>
      ) : groupByAisle && selectedCategory === 'All' && !searchQuery ? (
        // Grouped by Category/Aisle
        <div className="space-y-5">
          {Object.entries(groupedItems).map(([category, catItems]) => {
            const catStyle = CATEGORY_COLORS[category as ItemCategory] || CATEGORY_COLORS.Other;
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className={`w-2 h-2 rounded-full ${catStyle.dot}`}></span>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {category}
                  </h3>
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    ({catItems.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <GroceryItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat List
        <div className="space-y-2">
          {activeItems.map((item) => (
            <GroceryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
