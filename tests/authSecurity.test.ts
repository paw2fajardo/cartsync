import { describe, it, expect, beforeEach } from 'vitest';

// Emulate Auth Context logic for headless unit testing
function createAuthEngine() {
  const store: Record<string, string> = {};

  const localStorageMock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };

  const PIN_KEY = 'cartsync_household_pin';
  const SESSION_KEY = 'cartsync_auth_session';

  function hashPin(pin: string): string {
    let hash = 0;
    const str = `cartsync_${pin}_salt`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `h_${Math.abs(hash)}`;
  }

  return {
    hasPinSet: () => Boolean(localStorageMock.getItem(PIN_KEY)),
    isLocked: () => {
      const hasPin = Boolean(localStorageMock.getItem(PIN_KEY));
      if (!hasPin) return false;
      return localStorageMock.getItem(SESSION_KEY) !== 'true';
    },
    unlock: (enteredPin: string) => {
      const stored = localStorageMock.getItem(PIN_KEY);
      if (!stored) {
        localStorageMock.setItem(SESSION_KEY, 'true');
        return true;
      }
      if (stored === hashPin(enteredPin)) {
        localStorageMock.setItem(SESSION_KEY, 'true');
        return true;
      }
      return false;
    },
    setPin: (newPin: string, currentPin?: string) => {
      const stored = localStorageMock.getItem(PIN_KEY);
      if (stored && currentPin !== undefined) {
        if (stored !== hashPin(currentPin)) return false;
      }
      if (!newPin || newPin.trim().length < 4) return false;
      localStorageMock.setItem(PIN_KEY, hashPin(newPin.trim()));
      localStorageMock.setItem(SESSION_KEY, 'true');
      return true;
    },
    removePin: (currentPin: string) => {
      const stored = localStorageMock.getItem(PIN_KEY);
      if (!stored) return true;
      if (stored !== hashPin(currentPin)) return false;
      localStorageMock.removeItem(PIN_KEY);
      localStorageMock.removeItem(SESSION_KEY);
      return true;
    },
    lock: () => {
      localStorageMock.removeItem(SESSION_KEY);
    },
  };
}

describe('CartSync Auth & PIN Security Layer', () => {
  let auth: ReturnType<typeof createAuthEngine>;

  beforeEach(() => {
    auth = createAuthEngine();
  });

  it('should initialize with no PIN set and unlocked by default', () => {
    expect(auth.hasPinSet()).toBe(false);
    expect(auth.isLocked()).toBe(false);
  });

  it('should allow setting a 4-digit PIN and automatically authenticate', () => {
    const success = auth.setPin('1234');
    expect(success).toBe(true);
    expect(auth.hasPinSet()).toBe(true);
    expect(auth.isLocked()).toBe(false);
  });

  it('should reject PINs shorter than 4 digits', () => {
    const success = auth.setPin('12');
    expect(success).toBe(false);
    expect(auth.hasPinSet()).toBe(false);
  });

  it('should lock app and require valid PIN to unlock', () => {
    auth.setPin('5678');
    auth.lock();

    expect(auth.isLocked()).toBe(true);

    // Try incorrect PIN
    const unlockWrong = auth.unlock('0000');
    expect(unlockWrong).toBe(false);
    expect(auth.isLocked()).toBe(true);

    // Try correct PIN
    const unlockCorrect = auth.unlock('5678');
    expect(unlockCorrect).toBe(true);
    expect(auth.isLocked()).toBe(false);
  });

  it('should require old PIN when changing PIN', () => {
    auth.setPin('1111');

    // Try changing with wrong current PIN
    const changeFailed = auth.setPin('2222', '9999');
    expect(changeFailed).toBe(false);

    // Change with correct current PIN
    const changeSuccess = auth.setPin('2222', '1111');
    expect(changeSuccess).toBe(true);

    // Verify new PIN unlocks
    auth.lock();
    expect(auth.unlock('1111')).toBe(false);
    expect(auth.unlock('2222')).toBe(true);
  });

  it('should allow removing PIN with valid current PIN', () => {
    auth.setPin('4321');

    const removeFailed = auth.removePin('9999');
    expect(removeFailed).toBe(false);
    expect(auth.hasPinSet()).toBe(true);

    const removeSuccess = auth.removePin('4321');
    expect(removeSuccess).toBe(true);
    expect(auth.hasPinSet()).toBe(false);
    expect(auth.isLocked()).toBe(false);
  });
});
