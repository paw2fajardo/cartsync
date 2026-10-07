import React from 'react';

export const ModalLoadingFallback: React.FC<{ label?: string }> = ({ label = 'Loading...' }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-2xl border border-slate-200/90 dark:border-slate-700/90 max-w-xs w-full text-center">
      <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  </div>
);

export class ModalErrorBoundary extends React.Component<
  { children: React.ReactNode; onClose: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onClose: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-850 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Unable to load modal offline
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This section has not been cached yet. Please connect to the internet once to load it.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  this.props.onClose();
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer flex items-center justify-center touch-manipulation"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
