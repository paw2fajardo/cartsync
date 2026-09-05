import { useState, useEffect, useRef, useCallback } from 'react';

export const INACTIVITY_TIMEOUT_MS = 4 * 60 * 1000; // 4 minutes

export interface UseShopModeWakeLockOptions {
  enabled: boolean;
  inactivityTimeoutMs?: number;
  onAutoRelease?: () => void;
}

export interface UseShopModeWakeLockResult {
  isSupported: boolean;
  wakeLockActive: boolean;
  keepAwakeRequested: boolean;
  toggleKeepAwake: () => Promise<void>;
  setKeepAwakeRequested: (requested: boolean) => void;
  resetInactivityTimer: () => void;
  errorMessage: string | null;
}

/**
 * Battery-Conscious Wake Lock Engine
 * - Manages navigator.wakeLock.request('screen')
 * - Automatic 4-minute inactivity safety timer: if no touch/pointer interaction, release wake lock
 * - Releases wake lock automatically when document visibility changes (app backgrounded or screen locked)
 * - Re-request on return only if user re-engages or requested
 */
export function useShopModeWakeLock({
  enabled,
  inactivityTimeoutMs = INACTIVITY_TIMEOUT_MS,
  onAutoRelease,
}: UseShopModeWakeLockOptions): UseShopModeWakeLockResult {
  const [isSupported, setIsSupported] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [keepAwakeRequested, setKeepAwakeRequestedState] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wakeLockSentinelRef = useRef<any>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAwakeRequestedRef = useRef(keepAwakeRequested);
  keepAwakeRequestedRef.current = keepAwakeRequested;

  const onAutoReleaseRef = useRef(onAutoRelease);
  onAutoReleaseRef.current = onAutoRelease;

  // Check support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'navigator' in window && 'wakeLock' in navigator) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch {
        // Ignored if already released
      }
      wakeLockSentinelRef.current = null;
    }
    setWakeLockActive(false);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof window === 'undefined' || !('navigator' in window) || !('wakeLock' in navigator)) {
      return false;
    }

    // Only request if the document is visible
    if (document.visibilityState !== 'visible') {
      return false;
    }

    try {
      if (wakeLockSentinelRef.current && !wakeLockSentinelRef.current.released) {
        setWakeLockActive(true);
        return true;
      }

      const sentinel = await (navigator as any).wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;

      sentinel.addEventListener('release', () => {
        wakeLockSentinelRef.current = null;
        setWakeLockActive(false);
      });

      setWakeLockActive(true);
      setErrorMessage(null);
      return true;
    } catch (err: any) {
      setWakeLockActive(false);
      wakeLockSentinelRef.current = null;
      setErrorMessage(err?.message || 'Failed to acquire wake lock');
      return false;
    }
  }, []);

  // Inactivity Timer Handler: releases wake lock after 4 mins of no touch/click
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    if (!enabled || !keepAwakeRequestedRef.current) {
      return;
    }

    inactivityTimerRef.current = setTimeout(async () => {
      // Inactivity timeout reached: release wake lock to preserve battery
      await releaseWakeLock();
      if (onAutoReleaseRef.current) {
        onAutoReleaseRef.current();
      }
    }, inactivityTimeoutMs);
  }, [enabled, inactivityTimeoutMs, releaseWakeLock]);

  const setKeepAwakeRequested = useCallback(
    (requested: boolean) => {
      setKeepAwakeRequestedState(requested);
      if (!requested) {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        releaseWakeLock();
      } else if (enabled) {
        requestWakeLock().then((acquired) => {
          if (acquired) {
            resetInactivityTimer();
          }
        });
      }
    },
    [enabled, releaseWakeLock, requestWakeLock, resetInactivityTimer]
  );

  const toggleKeepAwake = useCallback(async () => {
    const nextState = !keepAwakeRequested;
    setKeepAwakeRequested(nextState);
  }, [keepAwakeRequested, setKeepAwakeRequested]);

  // Handle enabled changes & initial wake lock request
  useEffect(() => {
    if (!enabled) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      releaseWakeLock();
      return;
    }

    if (keepAwakeRequested) {
      requestWakeLock().then((acquired) => {
        if (acquired) {
          resetInactivityTimer();
        }
      });
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      releaseWakeLock();
    };
  }, [enabled, keepAwakeRequested, releaseWakeLock, requestWakeLock, resetInactivityTimer]);

  // Track touch/pointer events to reset inactivity timer while Shop Mode is active
  useEffect(() => {
    if (!enabled) return;

    const handleUserInteraction = () => {
      // If user had requested wake lock and it was auto-released due to inactivity, re-request on touch
      if (keepAwakeRequestedRef.current && !wakeLockSentinelRef.current && document.visibilityState === 'visible') {
        requestWakeLock().then(() => {
          resetInactivityTimer();
        });
      } else {
        resetInactivityTimer();
      }
    };

    const eventNames = ['touchstart', 'pointerdown', 'click', 'keydown'];
    eventNames.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    return () => {
      eventNames.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
    };
  }, [enabled, requestWakeLock, resetInactivityTimer]);

  // Handle document visibility change: release when hidden, re-request only when visible and user engaged
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        // App backgrounded or screen locked -> release immediately
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
        await releaseWakeLock();
      } else if (document.visibilityState === 'visible') {
        // App returned to foreground: do not re-request immediately unless user touches/re-engages or requested
        if (keepAwakeRequestedRef.current) {
          // If keep awake was requested, we resume wake lock on visibility
          const acquired = await requestWakeLock();
          if (acquired) {
            resetInactivityTimer();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, releaseWakeLock, requestWakeLock, resetInactivityTimer]);

  return {
    isSupported,
    wakeLockActive,
    keepAwakeRequested,
    toggleKeepAwake,
    setKeepAwakeRequested,
    resetInactivityTimer,
    errorMessage,
  };
}
