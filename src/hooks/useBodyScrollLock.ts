import { useEffect } from 'react';

// Global counter of active scroll locks so multiple stacked modals/drawers don't conflict
let lockCount = 0;
let previousOverflow = '';
let previousPosition = '';
let previousWidth = '';
let previousTop = '';
let scrollY = 0;

export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    if (lockCount === 0) {
      scrollY = window.scrollY;
      previousOverflow = document.body.style.overflow;
      previousPosition = document.body.style.position;
      previousWidth = document.body.style.width;
      previousTop = document.body.style.top;

      // Lock body scroll with iOS Safari & desktop viewport stability
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = previousOverflow;
        document.body.style.position = previousPosition;
        document.body.style.width = previousWidth;
        document.body.style.top = previousTop;
        window.scrollTo(0, scrollY);
      }
    };
  }, [isLocked]);
}
