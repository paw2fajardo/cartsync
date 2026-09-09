import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  PackageX,
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
  const { items, activeList, toggleItem, markItemUnavailable, openFinishShoppingModal } = useGrocery();
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

  // Filter items specifically for the active list (excluding unavailable items from Shop Mode)
  const currentListItems = useMemo(() => {
    return items.filter((i) => i.listId === activeList?.id && i.status !== 'unavailable');
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

            {/* Finish Shopping Button */}
            <button
              type="button"
              onClick={() => openFinishShoppingModal()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-none shadow-xs active:scale-95"
              title="Finish Shopping Trip"
              aria-label="Finish Shopping Trip"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden xs:inline">Finish</span>
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
              onClick={() => openFinishShoppingModal()}
              className="mt-4 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm cursor-pointer shadow-lg active:scale-98 transition-all inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Finish Shopping</span>
            </button>
          </div>
        ) : (
          /* Active Items Arranged Strictly by Aisle / Category Sequence */
          groupedActiveItems.map((group) => (
            <section key={group.category} className="space-y-1.5">
              {/* Category / Aisle Header */}
              <div className="flex items-center gap-2 px-1 pt-0.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                  {group.category}
                </span>
                <span className="text-[10px] font-bold text-neutral-500">
                  ({group.items.length})
                </span>
                <div className="flex-1 border-t border-neutral-900 ml-2" />
              </div>

              {/* Compact High-Density Item Rows (~42px height) */}
              <div className="divide-y divide-neutral-900 border border-neutral-900 rounded-xl bg-black overflow-hidden">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="min-h-[42px] px-2.5 py-1.5 flex items-center justify-between gap-2.5 select-none"
                  >
                    {/* Left: Dedicated Checkbox Button & Item Details */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleItemRowTap(item)}
                        className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all group"
                        title={item.completed ? 'Mark uncompleted' : 'Mark completed'}
                        aria-label={`Mark ${item.name} completed`}
                        role="checkbox"
                        aria-checked={item.completed}
                      >
                        <div className="w-5 h-5 rounded-md border-2 border-neutral-600 group-hover:border-emerald-500 group-active:border-emerald-400 flex items-center justify-center bg-black transition-colors">
                          {item.completed && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          )}
                        </div>
                      </button>

                      {/* Item Details */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm sm:text-base font-semibold text-white leading-tight tracking-tight truncate">
                          {item.name}
                        </span>
                        {item.note && (
                          <span className="text-[11px] text-neutral-400 truncate italic">
                            ({item.note})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Quantity Badge + Dedicated Out of Stock Button */}
                    <div className="shrink-0 flex items-center gap-1.5">
                      {/* Quantity Badge */}
                      <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white font-bold text-xs">
                        <span>{item.quantity}</span>
                        {item.unit && (
                          <span className="text-[10px] text-neutral-400 font-medium">
                            {item.unit}
                          </span>
                        )}
                      </div>

                      {/* Dedicated Out of Stock Button */}
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          triggerHaptic(20);
                          resetInactivityTimer();
                          await markItemUnavailable(item.id);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-400 border border-amber-500/30 active:scale-95 transition-all cursor-pointer"
                        title="Mark Out of Stock / Unavailable"
                        aria-label={`Mark ${item.name} out of stock`}
                      >
                        <PackageX className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}

        {/* 3. Collapsible "In Cart" Accordion at the Bottom */}
        {completedShopItems.length > 0 && (
          <div className="pt-3 border-t border-neutral-900">
            <button
              type="button"
              onClick={() => setIsInCartCollapsed(!isInCartCollapsed)}
              className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-neutral-950 border border-neutral-900 text-neutral-300 font-bold text-xs sm:text-sm cursor-pointer"
              aria-expanded={!isInCartCollapsed}
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-500 stroke-[2.2]" />
                <span>In Cart</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-neutral-900 text-emerald-400 border border-neutral-800">
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
              <div className="mt-1.5 divide-y divide-neutral-900 border border-neutral-900 rounded-xl bg-black overflow-hidden">
                {completedShopItems.map((item) => (
                  <div
                    key={item.id}
                    className="min-h-[38px] px-2.5 py-1.5 flex items-center justify-between gap-2.5 opacity-70 select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleItemRowTap(item)}
                        className="w-8 h-8 -ml-1 rounded-lg flex items-center justify-center shrink-0 cursor-pointer active:scale-95 transition-all group"
                        title="Unmark item"
                        aria-label={`Unmark ${item.name}`}
                        role="checkbox"
                        aria-checked="true"
                      >
                        <div className="w-5 h-5 rounded-md bg-emerald-600 border-2 border-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                        </div>
                      </button>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-sm font-medium line-through text-neutral-400 truncate">
                          {item.name}
                        </span>
                        {item.note && (
                          <span className="text-[11px] text-neutral-600 line-through truncate italic">
                            ({item.note})
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-neutral-500 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-900">
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
