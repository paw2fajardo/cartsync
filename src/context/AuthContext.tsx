import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  hasPinSet: boolean;
  householdName: string;
  autoLockMinutes: number; // 0 = never, 1 = 1m, 15 = 15m, 60 = 1h
  unlock: (pin: string) => boolean;
  setPin: (newPin: string, currentPin?: string) => boolean;
  removePin: (currentPin: string) => boolean;
  lock: () => void;
  setHouseholdName: (name: string) => void;
  setAutoLockMinutes: (minutes: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'cartsync_household_pin';
const SESSION_STORAGE_KEY = 'cartsync_auth_session';
const HOUSEHOLD_NAME_KEY = 'cartsync_household_name';
const AUTOLOCK_KEY = 'cartsync_autolock_minutes';
const LAST_ACTIVE_KEY = 'cartsync_last_active_timestamp';

// Simple fast SHA-256 hash or fallback for PIN verification
async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(`cartsync_${pin}_salt`);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fallback
    }
  }
  // Synchronous simple hash fallback for test environments without subtle crypto
  let hash = 0;
  const str = `cartsync_${pin}_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedPinHash, setStoredPinHash] = useState<string | null>(() => {
    return localStorage.getItem(PIN_STORAGE_KEY);
  });

  const [householdName, setHouseholdNameState] = useState<string>(() => {
    return localStorage.getItem(HOUSEHOLD_NAME_KEY) || 'Our Home';
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    const saved = localStorage.getItem(AUTOLOCK_KEY);
    return saved !== null ? parseInt(saved, 10) : 0; // Default: 0 (Manual lock / session based)
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const hasPin = Boolean(localStorage.getItem(PIN_STORAGE_KEY));
    if (!hasPin) return false;
    const sessionActive = localStorage.getItem(SESSION_STORAGE_KEY) === 'true';
    return !sessionActive;
  });

  const hasPinSet = Boolean(storedPinHash);
  const isAuthenticated = !hasPinSet || !isLocked;

  // Auto-lock timer tracker
  useEffect(() => {
    if (!hasPinSet || isLocked || autoLockMinutes <= 0) return;

    const recordActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    };

    // Check inactivity periodically
    const interval = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || '0', 10);
      if (lastActive && Date.now() - lastActive > autoLockMinutes * 60 * 1000) {
        lock();
      }
    }, 10000);

    window.addEventListener('pointerdown', recordActivity);
    window.addEventListener('keydown', recordActivity);
    recordActivity();

    return () => {
      clearInterval(interval);
      window.removeEventListener('pointerdown', recordActivity);
      window.removeEventListener('keydown', recordActivity);
    };
  }, [hasPinSet, isLocked, autoLockMinutes]);

  const unlock = (enteredPin: string): boolean => {
    if (!storedPinHash) {
      setIsLocked(false);
      localStorage.setItem(SESSION_STORAGE_KEY, 'true');
      return true;
    }

    // Direct match or hash comparison
    const rawMatch = storedPinHash === enteredPin;
    let hashMatch = false;

    // Synchronous check against known fast hash
    let hash = 0;
    const str = `cartsync_${enteredPin}_salt`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const syncHash = `h_${Math.abs(hash)}`;
    if (storedPinHash === syncHash) {
      hashMatch = true;
    }

    if (rawMatch || hashMatch) {
      setIsLocked(false);
      localStorage.setItem(SESSION_STORAGE_KEY, 'true');
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      return true;
    }

    // Attempt subtle crypto async match in background
    hashPin(enteredPin).then((h) => {
      if (storedPinHash === h) {
        setIsLocked(false);
        localStorage.setItem(SESSION_STORAGE_KEY, 'true');
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    });

    return false;
  };

  const setPin = (newPin: string, currentPin?: string): boolean => {
    if (hasPinSet && currentPin !== undefined) {
      const isOldValid = unlock(currentPin);
      if (!isOldValid) return false;
    }

    const trimmed = newPin.trim();
    if (!trimmed || trimmed.length < 4) return false;

    // Generate synchronous hash representation
    let hash = 0;
    const str = `cartsync_${trimmed}_salt`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const syncHash = `h_${Math.abs(hash)}`;

    setStoredPinHash(syncHash);
    localStorage.setItem(PIN_STORAGE_KEY, syncHash);
    localStorage.setItem(SESSION_STORAGE_KEY, 'true');
    setIsLocked(false);
    return true;
  };

  const removePin = (currentPin: string): boolean => {
    if (!hasPinSet) return true;
    const isValid = unlock(currentPin);
    if (!isValid) return false;

    setStoredPinHash(null);
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setIsLocked(false);
    return true;
  };

  const lock = () => {
    if (hasPinSet) {
      setIsLocked(true);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const setHouseholdName = (name: string) => {
    const trimmed = name.trim() || 'Our Home';
    setHouseholdNameState(trimmed);
    localStorage.setItem(HOUSEHOLD_NAME_KEY, trimmed);
  };

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    localStorage.setItem(AUTOLOCK_KEY, minutes.toString());
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLocked,
        hasPinSet,
        householdName,
        autoLockMinutes,
        unlock,
        setPin,
        removePin,
        lock,
        setHouseholdName,
        setAutoLockMinutes,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
