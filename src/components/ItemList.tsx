import React, { useState } from 'react';
import { Search, ShoppingBasket, X, Layers, Smartphone, Zap } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { GroceryItemCard } from './GroceryItemCard';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { ItemCategory } from '../types';
import { useSwipeListNavigation } from '../hooks/useSwipeListNavigation';

export const ItemList: React.FC = () => {
  const {
    activeItems,
    searchQuery,
    setSearchQuery,
    activeList,
    lists,
    activeListId,
    setActiveListId,
    items,
    openShopMode,
  } = useGrocery();
  const { device, activeHouseholdDevices } = useDevice();
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'category' | 'device'>('category');
  const [swipeTransition, setSwipeTransition] = useState<'left' | 'right' | null>(null);

  // Helper to resolve device display name & color for an item
  const getDeviceMeta = (item: typeof activeItems[0]) => {
    const targetDev = item.completed && item.completedBy ? item.completedBy : item.addedBy;
    const matchedProfile = targetDev?.deviceId
      ? (activeHouseholdDevices.find((d) => d.id === targetDev.deviceId) ||
         (device.id === targetDev.deviceId ? device : null))
      : null;

    const name = matchedProfile?.name || targetDev?.deviceName || 'Household';
    const color = matchedProfile?.color || targetDev?.color || '#10b981';
    return { name, color };
  };

  // Memoize grouped items and sort groups/items immutably
  const { groupedItems, sortedGroups, groupMeta } = React.useMemo(() => {
    if (sortBy === 'device') {
      // Group by Device Name
      const grouped: Record<string, typeof activeItems> = {};
      const metaMap: Record<string, { color: string }> = {};

      for (const item of activeItems) {
        const { name, color } = getDeviceMeta(item);
        if (!grouped[name]) {
          grouped[name] = [];
          metaMap[name] = { color };
        }
        grouped[name].push(item);
      }

      // Sort device names alphabetically (A-Z)
      const sortedKeys = Object.keys(grouped).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      // Sort items within each device group alphabetically by item name
      const sortedGrouped: Record<string, typeof activeItems> = {};
      for (const devName of sortedKeys) {
        sortedGrouped[devName] = [...grouped[devName]].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
      }

      return { groupedItems: sortedGrouped, sortedGroups: sortedKeys, groupMeta: metaMap };
    }

    // Default: Group & Sort by Category (A-Z)
    const grouped = activeItems.reduce<Record<string, typeof activeItems>>((acc, item) => {
      const cat = item.category || 'Other';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    // Sort categories alphabetically A to Z
    const sortedKeys = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    const sortedGrouped: Record<string, typeof activeItems> = {};
    for (const cat of sortedKeys) {
      sortedGrouped[cat] = [...grouped[cat]].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
    }

    return { groupedItems: sortedGrouped, sortedGroups: sortedKeys, groupMeta: {} };
  }, [activeItems, sortBy, activeHouseholdDevices, device]);

  useSwipeListNavigation({
    activeListId,
    lists,
    setActiveListId,
    setSwipeTransition,
  });

  const totalInList = items.filter((i) => i.listId === activeList?.id).length;

  return (
    <div className="space-y-3 pb-24">
      {/* Sticky Top Pane: List Name / Active Count & Toolbar */}
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

          {/* Quick Sort Toggle & Shop Mode Trigger */}
          <div className="flex items-center gap-1.5">
            {/* Shop Mode Button */}
            <button
              type="button"
              onClick={openShopMode}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
              title="Enter In-Store Shop Mode (Focus view, high contrast & keep awake)"
              aria-label="Enter Shop Mode"
            >
              <Zap className="w-3 h-3 fill-white stroke-none" />
              <span>Shop Mode</span>
            </button>

            <div className="flex items-center p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/80 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => setSortBy('category')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'category'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Sort by Category (A–Z)"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Category</span>
              </button>

              <button
                type="button"
                onClick={() => setSortBy('device')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  sortBy === 'device'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-bold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Sort by Device Name"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Device</span>
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
        /* Animated Sorted Groups (Category or Device) */
        <div
          className={`space-y-4 transition-all duration-200 ${
            swipeTransition === 'left'
              ? 'animate-in slide-in-from-right-6 fade-in duration-200'
              : swipeTransition === 'right'
              ? 'animate-in slide-in-from-left-6 fade-in duration-200'
              : ''
          }`}
        >
          {sortedGroups.map((groupKey) => {
            const groupItemList = groupedItems[groupKey] || [];
            const isCategoryMode = sortBy === 'category';
            const catStyle = isCategoryMode
              ? (CATEGORY_COLORS[groupKey as ItemCategory] || CATEGORY_COLORS.Other)
              : null;
            const deviceDotColor = !isCategoryMode ? (groupMeta[groupKey]?.color || '#10b981') : null;

            return (
              <div key={groupKey} className="space-y-1.5">
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  {isCategoryMode ? (
                    <span className={`w-1.5 h-1.5 rounded-full ${catStyle?.dot}`} />
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full shadow-2xs"
                      style={{ backgroundColor: deviceDotColor || '#10b981' }}
                    />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {groupKey}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                    ({groupItemList.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {groupItemList.map((item) => (
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
