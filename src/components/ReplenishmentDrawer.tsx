import React, { useState } from 'react';
import { History, Check, Plus, X, ShoppingBag } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { usePullDownDismiss } from '../hooks/usePullDownDismiss';
import { PullDownHandle } from './PullDownHandle';
import { CATEGORY_COLORS } from '../utils/smartCategorizer';
import { DeviceItemHistory, ItemCategory } from '../types';

export const ReplenishmentDrawer: React.FC = () => {
  const {
    isReplenishmentDrawerOpen,
    closeReplenishmentDrawer,
    deviceItemHistory,
    addFromHistory,
    activeList,
  } = useGrocery();
  const { device } = useDevice();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useModalBackNavigation(isReplenishmentDrawerOpen, closeReplenishmentDrawer, 'replenishment-drawer');
  useBodyScrollLock(isReplenishmentDrawerOpen);

  const pullDown = usePullDownDismiss({
    onDismiss: closeReplenishmentDrawer,
    enabled: isReplenishmentDrawerOpen,
  });

  if (!isReplenishmentDrawerOpen) return null;

  // Strict scoping by friendly deviceName
  const scopedHistory = deviceItemHistory.filter(
    (h) => h.deviceName.toLowerCase() === device.name.toLowerCase()
  );

  // Group past items by category aisle
  const groupedHistory = scopedHistory.reduce<Record<string, DeviceItemHistory[]>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedCategories = Object.keys(groupedHistory).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );

  const handleTapItem = async (histItem: DeviceItemHistory) => {
    // Multi-tap enabled: immediately add with quantity: 1 without dismissing drawer
    await addFromHistory(histItem);

    setAddedIds((prev) => {
      const next = new Set(prev);
      next.add(histItem.id);
      return next;
    });

    // Reset pill state back to standard after 2 seconds
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(histItem.id);
        return next;
      });
    }, 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={pullDown.backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeReplenishmentDrawer();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Past Bought Items"
        {...pullDown.containerProps}
        className="bg-white dark:bg-slate-850 border-t border-slate-200/90 dark:border-slate-700/90 rounded-t-3xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl pb-safe animate-in slide-in-from-bottom-6 duration-200 overflow-hidden"
      >
        <PullDownHandle
          onPointerDown={pullDown.handlePointerDown}
          isDragging={pullDown.isDragging}
        />

        {/* Drawer Header */}
        <div
          {...pullDown.headerProps}
          className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-750 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Past Bought Items
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Personal staples for <strong className="text-slate-700 dark:text-slate-300">{device.name}</strong> • Adding to {activeList?.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeReplenishmentDrawer}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable History Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
          {scopedHistory.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No history yet for {device.name}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
                Items completed during your shopping trips will appear here for instant 1-tap re-ordering.
              </p>
            </div>
          ) : (
            sortedCategories.map((cat) => {
              const catStyle = CATEGORY_COLORS[cat as ItemCategory] || CATEGORY_COLORS.Other;
              const itemsInCat = groupedHistory[cat] || [];

              return (
                <div key={cat} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {cat}
                    </span>
                    <span className="text-[10px] text-slate-400">({itemsInCat.length})</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {itemsInCat.map((hItem) => {
                      const isAdded = addedIds.has(hItem.id);
                      return (
                        <button
                          key={hItem.id}
                          type="button"
                          onClick={() => handleTapItem(hItem)}
                          className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer select-none ${
                            isAdded
                              ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{hItem.cleanName}</span>
                              {hItem.lastUnit && (
                                <span className="text-[10px] opacity-70">
                                  {hItem.lastUnit}
                                </span>
                              )}
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
