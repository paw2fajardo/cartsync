import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { usePullDownDismiss } from '../hooks/usePullDownDismiss';
import { PullDownHandle } from './PullDownHandle';

export const FinishShoppingModal: React.FC = () => {
  const {
    isFinishShoppingModalOpen,
    closeFinishShoppingModal,
    items,
    activeList,
    finishShoppingTrip,
  } = useGrocery();
  const { device } = useDevice();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useModalBackNavigation(isFinishShoppingModalOpen, closeFinishShoppingModal, 'finish-shopping-modal');
  useBodyScrollLock(isFinishShoppingModalOpen);

  const pullDown = usePullDownDismiss({
    onDismiss: closeFinishShoppingModal,
    enabled: isFinishShoppingModalOpen,
  });

  if (!isFinishShoppingModalOpen) return null;

  const listItems = items.filter((i) => i.listId === activeList?.id);
  const completedList = listItems.filter((i) => i.completed);
  const uncompletedList = listItems.filter((i) => !i.completed && i.status !== 'unavailable');
  const uncheckedCount = uncompletedList.length;
  const isScenarioA = uncheckedCount === 0;

  const handleFinishAndClear = async () => {
    setIsSubmitting(true);
    try {
      await finishShoppingTrip(false, activeList?.id);
      closeFinishShoppingModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveRemainingToUnavailableAndFinish = async () => {
    setIsSubmitting(true);
    try {
      await finishShoppingTrip(true, activeList?.id);
      closeFinishShoppingModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeepRemainingActiveAndFinish = async () => {
    setIsSubmitting(true);
    try {
      await finishShoppingTrip(false, activeList?.id);
      closeFinishShoppingModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={pullDown.backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeFinishShoppingModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Finish Shopping Trip"
        {...pullDown.containerProps}
        className="bg-white dark:bg-slate-850 border-t sm:border border-slate-200/90 dark:border-slate-700/90 rounded-t-3xl sm:rounded-3xl max-w-md w-full flex flex-col shadow-2xl pb-safe animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 overflow-hidden"
      >
        <PullDownHandle
          onPointerDown={pullDown.handlePointerDown}
          isDragging={pullDown.isDragging}
        />

        <div className="p-5 space-y-4">
          {/* Header Icon & Title */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
                {isScenarioA ? (
                  <Sparkles className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 stroke-[2.2]" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Finish Shopping Trip
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeList?.name || 'Groceries'} • {device.name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={closeFinishShoppingModal}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scenario A: All items checked or already marked unavailable */}
          {isScenarioA ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Finish shopping trip? {completedList.length} completed items will be archived to your personal history on <strong>{device.name}</strong>, and unfulfilled items will be restored to your aisles.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFinishAndClear}
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Finishing...' : 'Finish & Clear'}</span>
                </button>
                <button
                  type="button"
                  onClick={closeFinishShoppingModal}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer transition-all"
                >
                  Cancel / Keep Shopping
                </button>
              </div>
            </div>
          ) : (
            /* Scenario B: Unchecked items remain */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
                You still have <strong>{uncheckedCount}</strong> unchecked {uncheckedCount === 1 ? 'item' : 'items'}. Move them to Unavailable for this trip?
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Completed items will be saved to your purchase history. Restored unavailable items will stay in their standard category aisles with an <em>Unavailable</em> badge.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleMoveRemainingToUnavailableAndFinish}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Processing...' : 'Move Remaining to Unavailable & Finish'}
                </button>

                <button
                  type="button"
                  onClick={handleKeepRemainingActiveAndFinish}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 active:scale-98 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Processing...' : 'Keep Remaining Active & Finish'}
                </button>

                <button
                  type="button"
                  onClick={closeFinishShoppingModal}
                  disabled={isSubmitting}
                  className="w-full py-2 px-4 rounded-2xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel / Keep Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
