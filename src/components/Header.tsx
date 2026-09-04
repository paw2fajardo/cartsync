import React from 'react';
import { ShoppingBag, Wifi, WifiOff, Smartphone, Tablet, Laptop, Monitor, Home, RefreshCw, Menu } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useGrocery } from '../context/GroceryContext';
import { DeviceIcon } from '../types';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const DEVICE_ICONS: Record<DeviceIcon, React.FC<{ className?: string }>> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
  home: Home,
};

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { device, openRenameModal } = useDevice();
  const { syncStatus, openSyncModal } = useGrocery();

  const IconComponent = DEVICE_ICONS[device.icon] || Smartphone;

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Brand & Sidebar toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Toggle Lists"
            aria-label="Toggle Lists"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold tracking-tight text-base sm:text-lg text-zinc-900 dark:text-zinc-50">
                  Koffan
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 hidden sm:block">
                Local-first household groceries
              </p>
            </div>
          </div>
        </div>

        {/* Right: Sync Status & Device Attribution Badge */}
        <div className="flex items-center gap-2">
          {/* Sync Pill Button */}
          <button
            onClick={openSyncModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              syncStatus === 'connected'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                : syncStatus === 'connecting'
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200'
            }`}
            title="Real-time household sync status (Click for details)"
          >
            {syncStatus === 'connected' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="hidden sm:inline">Household Live</span>
                <Wifi className="w-3.5 h-3.5 sm:hidden" />
              </>
            ) : syncStatus === 'connecting' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Connecting...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Local Only</span>
              </>
            )}
          </button>

          {/* Device Rename / Attribution Badge */}
          <button
            onClick={openRenameModal}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200/80 dark:border-zinc-700/80 transition-all text-xs font-medium group"
            title="Current Device Attribution (Click to rename)"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs"
              style={{ backgroundColor: device.color }}
            >
              <IconComponent className="w-3.5 h-3.5" />
            </div>
            <span className="text-zinc-700 dark:text-zinc-300 max-w-[100px] truncate group-hover:text-zinc-900 dark:group-hover:text-white">
              {device.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
