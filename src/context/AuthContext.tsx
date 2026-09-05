import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncClient } from '../sync/syncClient';
import {
  isBiometricsAvailable,
  isBiometricsEnrolled,
  registerBiometrics,
  verifyBiometrics,
  removeBiometrics,
} from '../utils/biometrics';

interface AuthContextType {
  isAuthenticated: boolean;
  isLocked: boolean;
  hasPinSet: boolean;
  isAdmin: boolean;
  adminPinConfigured: boolean;
  householdName: string;
  autoLockMinutes: number; // 0 = never, 1 = 1m, 15 = 15m, 60 = 1h
  isAdminModalOpen: boolean;
  isBiometricsSupported: boolean;
  isBiometricsActive: boolean;
  unlock: (pin: string) => boolean;
  unlockWithBiometrics: () => Promise<boolean>;
  enableBiometrics: (userName?: string) => Promise<{ success: boolean; error?: string }>;
  disableBiometrics: () => void;
  setPin: (newPin: string, currentPin?: string) => boolean;
  removePin: (currentPin: string) => boolean;
  promoteToAdmin: (adminPin: string) => boolean;
  setAdminMasterPin: (newPin: string, currentPin?: string) => boolean;
  revokeAdmin: () => void;
  lock: () => void;
  openAdminModal: () => void;
  closeAdminModal: () => void;
  setHouseholdName: (name: string) => void;
  setAutoLockMinutes: (minutes: number) => void;
  purgeDevice: (deviceId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PIN_STORAGE_KEY = 'cartsync_household_pin';
const SESSION_STORAGE_KEY = 'cartsync_auth_session';
const HOUSEHOLD_NAME_KEY = 'cartsync_household_name';
const IS_ADMIN_KEY = 'cartsync_is_admin_v1';
const AUTOLOCK_KEY = 'cartsync_autolock_minutes';
const LAST_ACTIVE_KEY = 'cartsync_last_active_timestamp';

// Simple fast SHA-256 hash or fallback for PIN verification
function hashPinSync(pin: string): string {
  let hash = 0;
  const str = `cartsync_${pin.trim()}_salt`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [storedPinHash, setStoredPinHash] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(PIN_STORAGE_KEY) : null;
  });

  const [householdName, setHouseholdNameState] = useState<string>(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem(HOUSEHOLD_NAME_KEY) : null) || 'Our Home';
  });

  const [adminPinConfigured, setAdminPinConfigured] = useState<boolean>(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem(IS_ADMIN_KEY) === 'true' : false;
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(AUTOLOCK_KEY) : null;
    return saved !== null ? parseInt(saved, 10) : 0; // Default: 0 (Manual lock / session based)
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    const hasPin = typeof window !== 'undefined' && Boolean(localStorage.getItem(PIN_STORAGE_KEY));
    if (!hasPin) return false;
    const sessionActive = typeof window !== 'undefined' && localStorage.getItem(SESSION_STORAGE_KEY) === 'true';
    return !sessionActive;
  });

  // Biometrics State
  const [isBiometricsSupported, setIsBiometricsSupported] = useState<boolean>(false);
  const [isBiometricsActive, setIsBiometricsActive] = useState<boolean>(() => {
    return isBiometricsEnrolled();
  });

  const hasPinSet = Boolean(storedPinHash);
  const isAuthenticated = !hasPinSet || !isLocked;

  // Detect platform biometrics capability
  useEffect(() => {
    isBiometricsAvailable().then((supported) => {
      setIsBiometricsSupported(supported);
    });
  }, []);

  // Listen to WebSocket sync events for real-time updates
  useEffect(() => {
    const unsubscribe = syncClient.onSync((event) => {
      if (event.type === 'SYNC_STATE' && event.state) {
        if (event.state.householdName) {
          setHouseholdNameState(event.state.householdName);
          localStorage.setItem(HOUSEHOLD_NAME_KEY, event.state.householdName);
        }
        if (event.state.adminPinConfigured !== undefined) {
          setAdminPinConfigured(event.state.adminPinConfigured);
          if (!event.state.adminPinConfigured) {
            setIsAdmin(true);
            localStorage.setItem(IS_ADMIN_KEY, 'true');
          }
        }
      } else if (event.type === 'HOUSEHOLD_NAME_UPDATE' && event.householdName) {
        setHouseholdNameState(event.householdName);
        localStorage.setItem(HOUSEHOLD_NAME_KEY, event.householdName);
      } else if (event.type === 'ADMIN_PIN_UPDATE') {
        setAdminPinConfigured(Boolean(event.adminPinConfigured));
        if (!event.adminPinConfigured) {
          setIsAdmin(true);
          localStorage.setItem(IS_ADMIN_KEY, 'true');
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-lock timer tracker
  useEffect(() => {
    if (!hasPinSet || isLocked || autoLockMinutes <= 0) return;

    const recordActivity = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    };

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

    const syncHash = hashPinSync(enteredPin);
    if (storedPinHash === enteredPin || storedPinHash === syncHash) {
      setIsLocked(false);
      localStorage.setItem(SESSION_STORAGE_KEY, 'true');
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      return true;
    }

    return false;
  };

  const unlockWithBiometrics = async (): Promise<boolean> => {
    const res = await verifyBiometrics();
    if (res.success) {
      setIsLocked(false);
      localStorage.setItem(SESSION_STORAGE_KEY, 'true');
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      return true;
    }
    return false;
  };

  const enableBiometrics = async (userName?: string): Promise<{ success: boolean; error?: string }> => {
    const res = await registerBiometrics(userName || householdName);
    if (res.success) {
      setIsBiometricsActive(true);
    }
    return res;
  };

  const disableBiometrics = () => {
    removeBiometrics();
    setIsBiometricsActive(false);
  };

  const setPin = (newPin: string, currentPin?: string): boolean => {
    if (hasPinSet && currentPin !== undefined) {
      const isOldValid = unlock(currentPin);
      if (!isOldValid) return false;
    }

    const trimmed = newPin.trim();
    if (!trimmed || trimmed.length < 4) return false;

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

  const openAdminModal = () => setIsAdminModalOpen(true);
  const closeAdminModal = () => setIsAdminModalOpen(false);

  const setHouseholdName = (name: string) => {
    const trimmed = name.trim() || 'Our Home';
    setHouseholdNameState(trimmed);
    localStorage.setItem(HOUSEHOLD_NAME_KEY, trimmed);
    syncClient.broadcastHouseholdName(trimmed);
  };

  const promoteToAdmin = (adminPin: string): boolean => {
    if (!adminPinConfigured) {
      setIsAdmin(true);
      localStorage.setItem(IS_ADMIN_KEY, 'true');
      return true;
    }

    const enteredHash = hashPinSync(adminPin);
    if (storedPinHash === enteredHash || unlock(adminPin)) {
      setIsAdmin(true);
      localStorage.setItem(IS_ADMIN_KEY, 'true');
      return true;
    }
    return false;
  };

  const setAdminMasterPin = (newPin: string, currentPin?: string): boolean => {
    if (adminPinConfigured && currentPin !== undefined) {
      const isCurrentValid = unlock(currentPin) || (storedPinHash === hashPinSync(currentPin));
      if (!isCurrentValid) return false;
    }

    const trimmed = newPin.trim();
    if (!trimmed || trimmed.length < 4) return false;

    const syncHash = hashPinSync(trimmed);
    setStoredPinHash(syncHash);
    localStorage.setItem(PIN_STORAGE_KEY, syncHash);
    localStorage.setItem(IS_ADMIN_KEY, 'true');
    setIsAdmin(true);
    setAdminPinConfigured(true);

    syncClient.broadcastAdminPin(syncHash);
    return true;
  };

  const revokeAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem(IS_ADMIN_KEY);
  };

  const setAutoLockMinutes = (minutes: number) => {
    setAutoLockMinutesState(minutes);
    localStorage.setItem(AUTOLOCK_KEY, minutes.toString());
  };

  const purgeDevice = (deviceId: string) => {
    syncClient.broadcastDeviceDelete(deviceId);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLocked,
        hasPinSet,
        isAdmin,
        adminPinConfigured,
        householdName,
        autoLockMinutes,
        isAdminModalOpen,
        isBiometricsSupported,
        isBiometricsActive,
        unlock,
        unlockWithBiometrics,
        enableBiometrics,
        disableBiometrics,
        setPin,
        removePin,
        promoteToAdmin,
        setAdminMasterPin,
        revokeAdmin,
        lock,
        openAdminModal,
        closeAdminModal,
        setHouseholdName,
        setAutoLockMinutes,
        purgeDevice,
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
