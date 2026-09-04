import React, { createContext, useContext, useState, useEffect } from 'react';
import { DeviceIcon, DeviceProfile } from '../types';
import { detectDevice, saveDeviceProfile } from '../utils/deviceDetector';
import { syncClient } from '../sync/syncClient';

interface DeviceContextType {
  device: DeviceProfile;
  renameDevice: (name: string, color?: string, icon?: DeviceIcon) => void;
  isRenameOpen: boolean;
  openRenameModal: () => void;
  closeRenameModal: () => void;
  activeHouseholdDevices: DeviceProfile[];
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [device, setDevice] = useState<DeviceProfile>(() => detectDevice());
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [activeHouseholdDevices, setActiveHouseholdDevices] = useState<DeviceProfile[]>([device]);

  useEffect(() => {
    syncClient.init(device);

    const unsubscribe = syncClient.onSync((event) => {
      if (event.type === 'DEVICE_LIST' && event.devices) {
        setActiveHouseholdDevices(event.devices);
      } else if (event.type === 'SYNC_STATE' && event.state?.devices) {
        setActiveHouseholdDevices(event.state.devices);
      }
    });

    return () => unsubscribe();
  }, []);

  const renameDevice = (name: string, color?: string, icon?: DeviceIcon) => {
    const updated: DeviceProfile = {
      ...device,
      name: name.trim() || device.name,
      color: color || device.color,
      icon: icon || device.icon,
      isCustomName: true,
      lastActive: Date.now(),
    };
    setDevice(updated);
    saveDeviceProfile(updated);
    syncClient.updateDevice(updated);
  };

  return (
    <DeviceContext.Provider
      value={{
        device,
        renameDevice,
        isRenameOpen,
        openRenameModal: () => setIsRenameOpen(true),
        closeRenameModal: () => setIsRenameOpen(false),
        activeHouseholdDevices,
      }}
    >
      {children}
    </DeviceContext.Provider>
  );
};

export function useDevice(): DeviceContextType {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice must be used within a DeviceProvider');
  }
  return context;
}
