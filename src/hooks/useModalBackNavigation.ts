import { useEffect, useRef } from 'react';

/**
 * useModalBackNavigation
 *
 * Intercepts mobile hardware Back button, swipe back gesture, and browser Back button.
 * When a modal/drawer is opened:
 *  - Pushes a modal history state (`cartsyncModal: modalId`)
 *  - On hardware back (`popstate`), dismisses the modal.
 *  - If dismissed by user tap (close button / backdrop), cleans up the history entry gracefully.
 */
export function useModalBackNavigation(
  isOpen: boolean,
  onClose: () => void,
  modalId: string
): void {
  const isPushedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      if (!isPushedRef.current) {
        window.history.pushState({ cartsyncModal: modalId }, '', window.location.href);
        isPushedRef.current = true;
      }

      const handlePopState = (_e: PopStateEvent) => {
        // If back button pressed while this modal was open
        if (isPushedRef.current) {
          isPushedRef.current = false;
          onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);
        isPushedRef.current = false;
      };
    } else {
      isPushedRef.current = false;
    }
  }, [isOpen, modalId]);
}
