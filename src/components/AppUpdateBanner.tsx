import React from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate';

export interface AppUpdateBannerProps {
  updateAvailable?: boolean;
  onUpdate?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const AppUpdateBanner: React.FC<AppUpdateBannerProps> = ({
  updateAvailable: propUpdateAvailable,
  onUpdate: propOnUpdate,
  onDismiss: propOnDismiss,
  className = '',
}) => {
  const hookState = useServiceWorkerUpdate();

  const isAvailable = propUpdateAvailable !== undefined ? propUpdateAvailable : hookState.updateAvailable;
  const handleUpdate = propOnUpdate || hookState.updateServiceWorker;
  const handleDismiss = propOnDismiss || hookState.dismissUpdate;
  const isUpdating = hookState.isUpdating;

  if (!isAvailable) return null;

  return (
    <aside
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid="app-update-banner"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900/90 via-teal-900/85 to-slate-900/95 dark:from-emerald-950/90 dark:via-teal-950/90 dark:to-slate-900/95 text-white border border-emerald-500/40 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200 ${className}`}
    >
      {/* Subtle background glow effect */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 border border-emerald-400/30">
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-semibold text-white tracking-tight">
              New update available. Reload to apply.
            </p>
            <p className="text-[11px] text-emerald-200/75 hidden sm:block">
              Keeps offline lists and local data synchronized with the latest app bundle.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            data-testid="update-now-btn"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUpdating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isUpdating ? 'Updating...' : 'Update Now'}</span>
          </button>

          <button
            type="button"
            data-testid="dismiss-update-btn"
            onClick={handleDismiss}
            className="p-1.5 text-emerald-200/70 hover:text-white rounded-lg hover:bg-emerald-800/40 transition-colors cursor-pointer"
            title="Dismiss update banner"
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
