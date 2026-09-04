import React, { useState } from 'react';
import { X, Wifi, WifiOff, RefreshCw, Smartphone, Tablet, Laptop, Monitor, Home, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { DeviceIcon } from '../types';

const DEVICE_ICONS: Record<DeviceIcon, React.FC<{ className?: string }>> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
  home: Home,
};

export const SyncStatusModal: React.FC = () => {
  const { isSyncModalOpen, closeSyncModal, syncStatus, lastSyncedAt, triggerManualSync } = useGrocery();
  const { activeHouseholdDevices } = useDevice();
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isSyncModalOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await triggerManualSync();
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm ${
                syncStatus === 'connected'
                  ? 'bg-emerald-500'
                  : syncStatus === 'connecting'
                  ? 'bg-amber-500'
                  : 'bg-zinc-600'
              }`}
            >
              {syncStatus === 'connected' ? (
                <Wifi className="w-5 h-5" />
              ) : (
                <WifiOff className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Household Real-Time Sync
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {syncStatus === 'connected'
                  ? 'Connected to local sync broker'
                  : syncStatus === 'connecting'
                  ? 'Reconnecting to household server...'
                  : 'Offline mode (Local-first)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeSyncModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Server Status Card */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Network Status
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {syncStatus === 'connected' ? 'WebSocket Active' : 'Polling & Fallback'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 pt-1 border-t border-zinc-200 dark:border-zinc-700/60">
            <span>Last Synced:</span>
            <span className="font-mono">
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Just now'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Synchronizing...' : 'Force Household Sync Now'}</span>
          </button>
        </div>

        {/* Household Device Roster */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            <span>Household Devices</span>
            <span className="text-zinc-500 dark:text-zinc-400 font-normal">{activeHouseholdDevices.length} registered</span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {activeHouseholdDevices.map((dev) => {
              const DevIcon = DEVICE_ICONS[dev.icon] || Smartphone;
              return (
                <div
                  key={dev.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                      style={{ backgroundColor: dev.color }}
                    >
                      <DevIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {dev.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                        {dev.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Active</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Offline local-first badge */}
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Local-First Offline Storage:</strong> All changes are instantly written to your device's IndexedDB. You can create lists and check off items in grocery stores without any internet. Everything syncs automatically when you reconnect.
          </p>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={closeSyncModal}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white active:scale-95 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
