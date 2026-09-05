import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  X,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useShopModeWakeLock } from '../hooks/useShopModeWakeLock';
import { triggerHaptic } from '../utils/haptics';
import { GroceryItem } from '../types';

interface ShopModeViewProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShopModeView: React.FC<ShopModeViewProps> = ({ isOpen, onClose }) => {
  const { items, activeList, toggleItem } = useGrocery();
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isInCartCollapsed, setIsInCartCollapsed] = useState(true);

  // Wake lock engine
  const {
    isSupported: isWakeLockSupported,
    wakeLockActive,
    keepAwakeRequested,
    toggleKeepAwake,
    resetInactivityTimer,
  } = useShopModeWakeLock({
    enabled: isOpen,
  });

  // Filter items specifically for the active list
  const currentListItems = useMemo(() => {
    return items.filter((i) => i.listId === activeList?.id);
  }, [items, activeList?.id]);

  const activeShopItems = useMemo(() => {
    return currentListItems.filter((i) => !i.completed);
  }, [currentListItems]);

  const completedShopItems = useMemo(() => {
    return currentListItems.filter((i) => i.completed);
  }, [currentListItems]);

  const totalCount = currentListItems.length;
  const completedCount = completedShopItems.length;
  const remainingCount = activeShopItems.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Strict grouping by aisle / category sequence (A-Z)
  const groupedActiveItems = useMemo(() => {
    const grouped: Record<string, GroceryItem[]> = {};

    for (const item of activeShopItems) {
      const cat = item.category || 'Other';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(item);
    }

    // Sort category keys alphabetically (A-Z)
    const sortedCategories = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    // Sort items within each category alphabetically by name
    const result: { category: string; items: GroceryItem[] }[] = [];
    for (const cat of sortedCategories) {
      const sortedCatItems = [...grouped[cat]].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      result.push({ category: cat, items: sortedCatItems });
    }

    return result;
  }, [activeShopItems]);

  // Handle hardware / browser back events
  // Pushes state on entry. When popstate occurs, prompt to exit instead of navigating away.
  const isPushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      if (!isPushedRef.current) {
        window.history.pushState({ cartsyncShopMode: true }, '', window.location.href);
        isPushedRef.current = true;
      }

      const handlePopState = (_e: PopStateEvent) => {
        if (isPushedRef.current) {
          // Push state again so next back event can also be intercepted if user stays
          window.history.pushState({ cartsyncShopMode: true }, '', window.location.href);
          setShowExitConfirm(true);
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        isPushedRef.current = false;
      };
    } else {
      isPushedRef.current = false;
      setShowExitConfirm(false);
    }
  }, [isOpen]);

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  const handleItemRowTap = async (item: GroceryItem) => {
    triggerHaptic(20);
    resetInactivityTimer();
    await toggleItem(item.id);
  };

  if (!isOpen) return null;

  return (
    <div
      className="shop-mode-active fixed inset-0 z-50 flex flex-col bg-black text-white select-none overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* 1. Sticky Top Header Bar */}
      <header className="sticky top-0 z-20 shrink-0 bg-black border-b border-neutral-800 px-4 pt-safe">
        <div className="max-w-2xl mx-auto h-16 flex items-center justify-between gap-3">
          {/* Active List Title & Remaining Counter */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 fill-emerald-400 stroke-none" />
                Shop Mode
              </span>
              <span className="text-xs text-neutral-400 font-medium truncate">
                • {activeList?.name || 'Groceries'}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                {remainingCount}
              </span>
              <span className="text-xs font-medium text-neutral-400">
                of {totalCount} remaining
              </span>
            </div>
          </div>

          {/* Right Action Controls: Keep Awake Toggle & Exit Button */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Battery-Conscious Wake Lock Toggle */}
            <button
              type="button"
              onClick={toggleKeepAwake}
              disabled={!isWakeLockSupported}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-none cursor-pointer border ${
                wakeLockActive
                  ? 'bg-amber-400/20 text-amber-300 border-amber-500/40'
                  : keepAwakeRequested
                  ? 'bg-neutral-900 text-neutral-300 border-neutral-700'
                  : 'bg-neutral-900/60 text-neutral-500 border-neutral-800'
              }`}
              title={
                !isWakeLockSupported
                  ? 'Wake Lock not supported on this browser'
                  : wakeLockActive
                  ? 'Screen Stay-Awake Active (Tap to toggle)'
                  : 'Screen Sleep Enabled (Tap to keep awake)'
              }
              aria-label="Toggle Keep Awake"
            >
              {wakeLockActive ? (
                <>
                  <Sun className="w-3.5 h-3.5 stroke-[2.5] text-amber-400" />
                  <span className="hidden sm:inline">Awake</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 stroke-[2]" />
                  <span className="hidden sm:inline">Auto-Sleep</span>
                </>
              )}
            </button>

            {/* Exit Shop Mode Button */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-bold cursor-pointer transition-none"
              title="Exit Shop Mode"
              aria-label="Exit Shop Mode"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* Slim Linear Progress Bar */}
        <div className="w-full bg-neutral-900 h-1 mt-1 overflow-hidden rounded-full">
          <div
            className="bg-emerald-500 h-full transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* 2. Scrollable Checklist Body */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6 max-w-2xl w-full mx-auto pb-safe">
        {/* Empty State when everything is gathered */}
        {activeShopItems.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold text-white">All Items Gathered!</h2>
            <p className="text-sm text-neutral-400 max-w-xs mx-auto">
              You checked off every item on {activeList?.name || 'this list'}. Ready for checkout!
            </p>
            <button
              type="button"
              onClick={handleConfirmExit}
              className="mt-4 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-sm cursor-pointer shadow-lg active:scale-98"
            >
              Finish Shopping
            </button>
          </div>
        ) : (
          /* Active Items Arranged Strictly by Aisle / Category Sequence */
          groupedActiveItems.map((group) => (
            <section key={group.category} className="space-y-2">
              {/* Category / Aisle Header */}
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  {group.category}
                </span>
                <span className="text-[11px] font-bold text-neutral-500">
                  ({group.items.length})
                </span>
                <div className="flex-1 border-t border-neutral-900 ml-2" />
              </div>

              {/* 56px+ Touch Target Item Rows */}
              <div className="divide-y divide-neutral-900 border border-neutral-900 rounded-2xl bg-black overflow-hidden">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemRowTap(item)}
                    className="min-h-[58px] px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer active:bg-neutral-900/80 transition-none"
                    role="checkbox"
                    aria-checked={item.completed}
                    tabIndex={0}
                  >
                    {/* Checkbox Target (48px+ touch area) */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-12 h-12 -ml-2 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
                        aria-hidden="true"
                      >
                        <div className="w-6 h-6 rounded-lg border-2 border-neutral-600 flex items-center justify-center bg-black">
                          {item.completed && (
                            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                          )}
                        </div>
                      </div>

                      {/* Item Details */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-base sm:text-lg font-bold text-white leading-snug tracking-tight truncate">
                          {item.name}
                        </span>
                        {item.note && (
                          <span className="text-xs text-neutral-400 truncate mt-0.5">
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quantity Badge */}
                    <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-sm">
                      <span>{item.quantity}</span>
                      {item.unit && (
                        <span className="text-xs text-neutral-400 font-medium">
                          {item.unit}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* 3. Collapsible "In Cart" Accordion at the Bottom */}
        {completedShopItems.length > 0 && (
          <div className="pt-4 border-t border-neutral-900">
            <button
              type="button"
              onClick={() => setIsInCartCollapsed(!isInCartCollapsed)}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-neutral-950 border border-neutral-900 text-neutral-300 font-bold text-sm cursor-pointer"
              aria-expanded={!isInCartCollapsed}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500 stroke-[2.2]" />
                <span>In Cart</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-900 text-emerald-400 border border-neutral-800">
                  {completedShopItems.length}
                </span>
              </div>
              {isInCartCollapsed ? (
                <ChevronDown className="w-4 h-4 text-neutral-500" />
              ) : (
                <ChevronUp className="w-4 h-4 text-neutral-500" />
              )}
            </button>

            {!isInCartCollapsed && (
              <div className="mt-2 divide-y divide-neutral-900 border border-neutral-900 rounded-2xl bg-black overflow-hidden">
                {completedShopItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemRowTap(item)}
                    className="min-h-[56px] px-3.5 py-3 flex items-center justify-between gap-3 cursor-pointer opacity-60 active:opacity-100 transition-none"
                    role="checkbox"
                    aria-checked="true"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-12 h-12 -ml-2 rounded-xl flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <div className="w-6 h-6 rounded-lg bg-emerald-600 border-2 border-emerald-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-base font-medium line-through text-neutral-400 truncate">
                          {item.name}
                        </span>
                        {item.note && (
                          <span className="text-xs text-neutral-600 line-through truncate">
                            {item.note}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-bold text-neutral-500 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-900">
                      {item.quantity} {item.unit || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Exit Confirmation Interception Dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-neutral-950 border border-neutral-800 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Exit Shop Mode?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                You still have <strong>{remainingCount} items</strong> to gather. Are you sure you want to return to list management?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold border border-neutral-700 cursor-pointer"
              >
                Keep Shopping
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Exit Mode
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
