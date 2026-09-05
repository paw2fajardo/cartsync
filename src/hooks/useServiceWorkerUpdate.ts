import { useState, useEffect, useCallback, useRef } from 'react';

export interface ServiceWorkerUpdateState {
  updateAvailable: boolean;
  hasUpdate: boolean;
  isUpdating: boolean;
  updateServiceWorker: () => void;
  applyUpdate: () => void;
  dismissUpdate: () => void;
  registration: ServiceWorkerRegistration | null;
  waitingWorker: ServiceWorker | null;
}

/**
 * Custom React hook to detect service worker updates, listen for waiting workers,
 * trigger skipWaiting activation, and handle safe automatic reload upon controllerchange.
 */
export function useServiceWorkerUpdate(): ServiceWorkerUpdateState {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  // Keep a ref to the waiting worker for callbacks
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  waitingWorkerRef.current = waitingWorker;

  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  registrationRef.current = registration;

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;

    // Listen for controllerchange: when the new service worker activates and claims clients,
    // automatically trigger a clean page reload.
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    const trackWorker = (worker: ServiceWorker) => {
      worker.addEventListener('statechange', () => {
        // If a new worker is installed and there is already an active controller,
        // it means an update is waiting to take over.
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
          setUpdateAvailable(true);
        }
      });
    };

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg);

      // 1. If there's already a waiting worker, an update was downloaded previously
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
        setUpdateAvailable(true);
      }

      // 2. If a worker is currently installing, monitor its state change
      if (reg.installing) {
        trackWorker(reg.installing);
      }

      // 3. Listen for future updates found during the session
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          trackWorker(installingWorker);
        }
      });
    };

    // Obtain current registration
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => {
        if (reg) {
          attachRegistration(reg);
        }
      })
      .catch((err) => {
        console.warn('Failed to get service worker registration:', err);
      });

    // Also listen when serviceWorker.ready resolves
    navigator.serviceWorker.ready
      .then((reg) => {
        if (reg) {
          attachRegistration(reg);
        }
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    setIsUpdating(true);

    const targetWorker = waitingWorkerRef.current || registrationRef.current?.waiting;

    if (targetWorker) {
      // Send SKIP_WAITING to tell the waiting service worker to activate
      targetWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload if worker reference is unavailable
      window.location.reload();
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    setIsDismissed(true);
  }, []);

  const effectiveUpdateAvailable = updateAvailable && !isDismissed;

  return {
    updateAvailable: effectiveUpdateAvailable,
    hasUpdate: effectiveUpdateAvailable,
    isUpdating,
    updateServiceWorker,
    applyUpdate: updateServiceWorker,
    dismissUpdate,
    registration,
    waitingWorker,
  };
}
