import React from 'react';

interface PullDownHandleProps {
  onPointerDown?: (e: React.PointerEvent) => void;
  isDragging?: boolean;
  showCue?: boolean;
  cueText?: string;
  className?: string;
}

/**
 * PullDownHandle
 *
 * Ergonomic pull-down indicator bar for mobile bottom sheets.
 * Features:
 * - Generous 48px+ touch envelope for effortless thumb targeting anywhere near the top
 * - Visual pill bar with interactive highlight feedback during drag
 * - `touch-action: none` to guarantee no browser native scroll hijacking
 * - Accessible aria labeling
 */
export const PullDownHandle: React.FC<PullDownHandleProps> = ({
  onPointerDown,
  isDragging = false,
  showCue = false,
  cueText = 'Swipe down or tap outside to close',
  className = '',
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Pull down indicator: drag to dismiss"
      onPointerDown={onPointerDown}
      className={`sm:hidden flex flex-col items-center justify-center py-3.5 min-h-[48px] cursor-grab active:cursor-grabbing select-none shrink-0 w-full touch-none group -mb-1 ${className}`}
    >
      <div
        className={`w-14 h-1.5 rounded-full transition-all duration-150 ${
          isDragging
            ? 'bg-slate-500 dark:bg-slate-400 scale-x-110'
            : 'bg-slate-300 dark:bg-slate-600 group-hover:bg-slate-400 dark:group-hover:bg-slate-500'
        }`}
      />
      {showCue && (
        <span className="text-[9px] text-slate-400 font-medium mt-1.5 select-none pointer-events-none">
          {cueText}
        </span>
      )}
    </div>
  );
};
