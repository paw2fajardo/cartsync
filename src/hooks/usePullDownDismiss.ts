import { useState, useRef, useCallback, useEffect } from 'react';

export interface UsePullDownDismissOptions {
  onDismiss: () => void;
  threshold?: number; // Distance in px to trigger dismiss (default: 60)
  velocityThreshold?: number; // px/ms for quick flick dismiss (default: 0.3)
  rubberBandFactor?: number; // Resistance when dragging upward (default: 0.15)
  enabled?: boolean;
}

export interface UsePullDownDismissResult {
  dragY: number;
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  headerProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
  };
  containerRef: (node: HTMLDivElement | null) => void;
  containerProps: {
    ref: (node: HTMLDivElement | null) => void;
    onPointerDown: (e: React.PointerEvent) => void;
    style: React.CSSProperties;
    'data-disable-swipe': string;
  };
  backdropStyle: React.CSSProperties;
}

// Find closest scrollable parent up to container
function getScrollParent(node: HTMLElement | null, stopNode: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = node;
  while (current && current !== stopNode) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY;
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      current.scrollHeight > current.clientHeight
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * usePullDownDismiss
 *
 * Universal, high-performance pull-down-to-dismiss hook for mobile bottom sheets.
 * - Full-surface downward swipe: Swiping down ANYWHERE on the modal when scrollTop <= 0
 *   smoothly pulls down and dismisses the sheet.
 * - Uses non-passive touchmove listeners to cancel browser overscroll/pull-to-refresh.
 * - PointerEvents support for desktop mouse/trackpad drag on handle and header.
 * - Protected sliders: Ignores horizontal drag components on SlideToConfirm controls.
 */
export function usePullDownDismiss({
  onDismiss,
  threshold = 60,
  velocityThreshold = 0.3,
  rubberBandFactor = 0.15,
  enabled = true,
}: UsePullDownDismissOptions): UsePullDownDismissResult {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const containerNodeRef = useRef<HTMLDivElement | null>(null);

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Touch tracking state
  const touchStateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    target: HTMLElement;
    isPulling: boolean;
    scrollParent: HTMLElement | null;
  } | null>(null);

  // Pointer tracking state (for desktop mouse drag)
  const pointerStateRef = useRef<{
    startX: number;
    startY: number;
    startTime: number;
    pointerId: number;
    target: HTMLElement;
    isImmediate: boolean;
  } | null>(null);

  // Setup non-passive touch listeners on container DOM element
  useEffect(() => {
    const container = containerNodeRef.current;
    if (!container || !enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStateRef.current = null;
        return;
      }

      const touch = e.touches[0];
      const target = touch.target as HTMLElement;

      // Don't intercept slide-to-confirm horizontal sliders
      if (target.closest('.slide-to-confirm') || target.closest('[data-no-drag="true"]')) {
        touchStateRef.current = null;
        return;
      }

      const scrollParent = getScrollParent(target, container);

      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        target,
        isPulling: false,
        scrollParent,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStateRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStateRef.current.startX;
      const deltaY = touch.clientY - touchStateRef.current.startY;

      const { isPulling, scrollParent } = touchStateRef.current;

      // Check current scroll position
      const isAtTop = !scrollParent || scrollParent.scrollTop <= 0;

      if (!isPulling) {
        // Must be a downward gesture (deltaY > 0)
        if (deltaY <= 0) {
          // Scrolling down into content
          return;
        }

        // Must be primarily vertical
        if (Math.abs(deltaX) > deltaY) {
          // Horizontal gesture
          return;
        }

        // If at top of scrollable content and dragged down past 6px -> engage pull down!
        if (isAtTop && deltaY >= 6) {
          touchStateRef.current.isPulling = true;
          setIsDragging(true);

          // Blur active input to dismiss virtual keyboard if open
          if (
            document.activeElement &&
            (document.activeElement.tagName === 'INPUT' ||
              document.activeElement.tagName === 'TEXTAREA')
          ) {
            (document.activeElement as HTMLElement).blur();
          }
        } else {
          return;
        }
      }

      // If pulling is active:
      if (touchStateRef.current.isPulling) {
        // PREVENT BROWSER NATIVE OVERSCROLL!
        if (e.cancelable) {
          e.preventDefault();
        }

        if (deltaY > 0) {
          setDragY(deltaY);
        } else {
          setDragY(deltaY * rubberBandFactor);
        }
      }
    };

    const handleTouchEndOrCancel = (e: TouchEvent) => {
      if (!touchStateRef.current) return;

      const { startY, startTime, isPulling } = touchStateRef.current;
      touchStateRef.current = null;

      if (!isPulling) {
        setDragY(0);
        setIsDragging(false);
        return;
      }

      const touch = e.changedTouches && e.changedTouches[0];
      const endY = touch ? touch.clientY : startY;
      const deltaY = endY - startY;
      const deltaTime = Math.max(1, Date.now() - startTime);
      const velocity = deltaY / deltaTime; // px/ms

      setIsDragging(false);

      const isFlick = velocity >= velocityThreshold && deltaY >= 20;
      const isPastThreshold = deltaY >= threshold;

      if (isFlick || isPastThreshold) {
        setDragY(Math.max(deltaY, 250));
        setTimeout(() => {
          onDismissRef.current();
          setDragY(0);
        }, 120);
      } else {
        setDragY(0);
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEndOrCancel, { passive: true });
    container.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEndOrCancel);
      container.removeEventListener('touchcancel', handleTouchEndOrCancel);
    };
  }, [enabled, rubberBandFactor, threshold, velocityThreshold]);

  // Desktop Pointer handlers (mouse / trackpad)
  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!pointerStateRef.current || e.pointerId !== pointerStateRef.current.pointerId) return;

      const deltaY = e.clientY - pointerStateRef.current.startY;

      if (deltaY > 0) {
        setDragY(deltaY);
      } else {
        setDragY(deltaY * rubberBandFactor);
      }
    },
    [rubberBandFactor]
  );

  const handlePointerEnd = useCallback(
    (e: PointerEvent) => {
      if (!pointerStateRef.current || e.pointerId !== pointerStateRef.current.pointerId) return;

      const deltaY = e.clientY - pointerStateRef.current.startY;
      const deltaTime = Math.max(1, Date.now() - pointerStateRef.current.startTime);
      const velocity = deltaY / deltaTime;

      try {
        if (pointerStateRef.current.target.hasPointerCapture(pointerStateRef.current.pointerId)) {
          pointerStateRef.current.target.releasePointerCapture(pointerStateRef.current.pointerId);
        }
      } catch {
        // Ignore
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      pointerStateRef.current = null;

      setIsDragging(false);

      const isFlick = velocity >= velocityThreshold && deltaY >= 20;
      const isPastThreshold = deltaY >= threshold;

      if (isFlick || isPastThreshold) {
        setDragY(Math.max(deltaY, 250));
        setTimeout(() => {
          onDismissRef.current();
          setDragY(0);
        }, 120);
      } else {
        setDragY(0);
      }
    },
    [handlePointerMove, threshold, velocityThreshold]
  );

  // Dedicated Handle pointer down (mouse/touch)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;

      const target = e.currentTarget as HTMLElement;
      try {
        target.setPointerCapture(e.pointerId);
      } catch {
        // Fallback
      }

      pointerStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
        pointerId: e.pointerId,
        target,
        isImmediate: true,
      };

      setIsDragging(true);

      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd, { passive: true });
      window.addEventListener('pointercancel', handlePointerEnd, { passive: true });
    },
    [enabled, handlePointerMove, handlePointerEnd]
  );

  // Header pointer down (for desktop mouse drag outside buttons)
  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!enabled || e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('a') ||
        target.closest('[role="button"]')
      ) {
        return;
      }

      handlePointerDown(e);
    },
    [enabled, handlePointerDown]
  );

  // Callback ref to bind DOM container node
  const setContainerNode = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node;
  }, []);

  const backdropOpacity = isDragging && dragY > 0
    ? Math.max(0.2, 1 - dragY / 350)
    : 1;

  const containerStyle: React.CSSProperties = {
    transform: dragY !== 0 ? `translate3d(0, ${Math.round(dragY)}px, 0)` : undefined,
    transition: isDragging
      ? 'none'
      : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
  };

  return {
    dragY,
    isDragging,
    handlePointerDown,
    headerProps: {
      onPointerDown: handleHeaderPointerDown,
      style: { touchAction: 'none' },
    },
    containerRef: setContainerNode,
    containerProps: {
      ref: setContainerNode,
      onPointerDown: (e: React.PointerEvent) => {
        // Mouse drag on empty space of card
        if (e.pointerType === 'mouse') {
          handleHeaderPointerDown(e);
        }
      },
      style: containerStyle,
      'data-disable-swipe': 'true',
    },
    backdropStyle: {
      opacity: backdropOpacity,
      transition: isDragging ? 'none' : 'opacity 0.2s ease',
    },
  };
}
