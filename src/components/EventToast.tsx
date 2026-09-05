import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';

export const EventToast: React.FC = () => {
  const { activeToast, dismissToast, undoLastDelete } = useGrocery();

  if (!activeToast) return null;

  const isCreation = activeToast.type === 'created';
  const item = activeToast.item;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-20 sm:bottom-22 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md animate-in slide-in-from-bottom-4 fade-in duration-200 pointer-events-auto"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 dark:bg-slate-850/95 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md">
        {/* Left Side: Indicator & Text */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isCreation ? (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-xs" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 shadow-xs" />
          )}

          <p className="text-xs font-medium text-slate-200 truncate">
            {isCreation ? (
              <>
                Added{' '}
                <span className="font-semibold text-white">
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.name}
                </span>
                {activeToast.actorDevice && (
                  <span className="text-slate-400 font-normal">
                    {' '}from {activeToast.actorDevice.deviceName}
                  </span>
                )}
              </>
            ) : (
              <>
                Deleted{' '}
                <span className="font-semibold text-white">
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.name}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {!isCreation && (
            <button
              type="button"
              onClick={undoLastDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Undo</span>
            </button>
          )}

          <button
            type="button"
            onClick={dismissToast}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
