/**
 * Light touch haptic feedback utility
 * Uses navigator.vibrate if supported by browser/device.
 */
export function triggerHaptic(durationMs: number = 18): void {
  if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore vibration permissions or platform errors
    }
  }
}
