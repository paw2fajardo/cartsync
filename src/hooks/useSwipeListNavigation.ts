import { useEffect, useRef } from 'react';

interface UseSwipeListNavigationOptions {
  activeListId: string;
  lists: Array<{ id: string; name: string }>;
  setActiveListId: (id: string) => void;
  setSwipeTransition?: (direction: 'left' | 'right' | null) => void;
  enabled?: boolean;
}

/**
 * useSwipeListNavigation
 * Attaches passive touch and pointer listeners directly at window / document level
 * to handle horizontal list switching across all devices and mobile browsers reliably.
 * Supports:
 * - Circular wrap-around or linear switching across Shopping Lists
 * - Handling touchstart, touchmove, touchend, AND touchcancel (crucial for mobile edge gestures)
 * - Ignoring vertical scrolling or swipes inside text inputs, textareas, or open modal overlays
 */
export function useSwipeListNavigation({
  activeListId,
  lists,
  setActiveListId,
  setSwipeTransition,
  enabled = true,
}: UseSwipeListNavigationOptions) {
  // Use refs so event listeners always access the freshest state without re-attaching
  const activeListIdRef = useRef(activeListId);
  const listsRef = useRef(lists);
  const setActiveListIdRef = useRef(setActiveListId);
  const setSwipeTransitionRef = useRef(setSwipeTransition);

  activeListIdRef.current = activeListId;
  listsRef.current = lists;
  setActiveListIdRef.current = setActiveListId;
  setSwipeTransitionRef.current = setSwipeTransition;

  const touchStartRef = useRef<{
    x: number;
    y: number;
    time: number;
    isHorizontal?: boolean;
    cancelled?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only single-finger touches
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const target = e.target as HTMLElement | null;

      // Do NOT trigger swipe navigation if interacting with input, textarea, select, or inside modal dialogs
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable ||
          target.closest('dialog') ||
          target.closest('[role="dialog"]') ||
          target.closest('.modal-backdrop') ||
          target.closest('[data-disable-swipe="true"]'))
      ) {
        touchStartRef.current = null;
        return;
      }

      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
        isHorizontal: undefined,
        cancelled: false,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const dx = currentX - touchStartRef.current.x;
      const dy = currentY - touchStartRef.current.y;

      // Determine gesture direction once past 6px movement
      if (touchStartRef.current.isHorizontal === undefined) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          // It's a horizontal swipe if dx is greater than dy
          touchStartRef.current.isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }
    };

    const handleTouchEndOrCancel = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const { x: startX, time: startTime, isHorizontal } = touchStartRef.current;
      touchStartRef.current = null;

      // For touchend, changedTouches has the final touch coordinates.
      // For touchcancel, changedTouches might still be available or we can check last move.
      const touch = e.changedTouches && e.changedTouches[0];
      if (!touch) return;

      const endX = touch.clientX;
      const dx = endX - startX;
      const elapsed = Date.now() - startTime;

      // Ergonomic thresholds:
      // Minimum displacement: 35px
      // Maximum time: 800ms (fast/normal swipe gesture, avoids slow drags or holds)
      const isQuickSwipe = elapsed < 800 && Math.abs(dx) >= 35;
      const isLongSwipe = Math.abs(dx) >= 70;

      if ((isHorizontal || isHorizontal === undefined) && (isQuickSwipe || isLongSwipe)) {
        const currentLists = listsRef.current;
        if (!currentLists || currentLists.length <= 1) return;

        const currentId = activeListIdRef.current;
        const currentIndex = currentLists.findIndex((l) => l.id === currentId);
        if (currentIndex === -1) return;

        if (dx < 0) {
          // Swiped Left (<---) -> Advance to NEXT Shopping List (with circular wrap-around)
          const nextIndex = (currentIndex + 1) % currentLists.length;
          const nextList = currentLists[nextIndex];
          if (nextList && nextList.id !== currentId) {
            setSwipeTransitionRef.current?.('left');
            setActiveListIdRef.current(nextList.id);
            setTimeout(() => setSwipeTransitionRef.current?.(null), 250);
          }
        } else if (dx > 0) {
          // Swiped Right (--->) -> Go BACK to PREVIOUS Shopping List (with circular wrap-around)
          const prevIndex = (currentIndex - 1 + currentLists.length) % currentLists.length;
          const prevList = currentLists[prevIndex];
          if (prevList && prevList.id !== currentId) {
            setSwipeTransitionRef.current?.('right');
            setActiveListIdRef.current(prevList.id);
            setTimeout(() => setSwipeTransitionRef.current?.(null), 250);
          }
        }
      }
    };

    // Attach listeners with passive: true so scrolling remains 60fps smooth
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    window.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEndOrCancel);
      window.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [enabled]);
}
