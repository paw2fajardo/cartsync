import { useEffect, useRef } from 'react';

/**
 * useModalBackNavigation
 *
 * Intercepts mobile hardware Back button, swipe back gesture, and browser Back button.
 * When a modal, drawer, or sheet is opened:
 *  - Pushes a pseudo history state to window.history (`history.pushState({ modalId }, '')`)
 *  - Listens for `popstate` events. If the user presses Back, closes the modal and stays in the PWA.
 *  - If the user closes the modal via UI (e.g. clicking 'X', Cancel, or backdrop),
 *    smoothly pops the history entry so back history does not get desynchronized.
 *
 * @param isOpen Whether the modal/drawer/window is currently open
 * @param onClose Callback to close the modal
 * @param modalId Unique identifier for this modal (for history state tracking)
 */
export function useModalBackNavigation(
  isOpen: boolean,
  onClose: () => void,
  modalId: string
): void {
  const isPushedRef = useRef(false);
  const isPoppedByBackButtonRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      // Push history state if not already pushed for this modal instance
      if (!isPushedRef.current) {
        window.history.pushState({ cartsyncModal: modalId }, '', window.location.href);
        isPushedRef.current = true;
      }

      const handlePopState = () => {
        // Popstate was triggered by browser/hardware Back navigation
        if (isPushedRef.current) {
          isPushedRef.current = false;
          isPoppedByBackButtonRef.current = true;
          onCloseRef.current();
        }
      };

      window.addEventListener('popstate', handlePopState);

      return () => {
        window.removeEventListener('popstate', handlePopState);

        // If the modal is unmounting or closing programmatically (not via hardware back button),
        // we pop the history state we pushed so history stays clean.
        if (isPushedRef.current && !isPoppedByBackButtonRef.current) {
          isPushedRef.current = false;
          window.history.back();
        }
        isPoppedByBackButtonRef.current = false;
      };
    } else {
      isPushedRef.current = false;
      isPoppedByBackButtonRef.current = false;
    }
  }, [isOpen, modalId]);
}
