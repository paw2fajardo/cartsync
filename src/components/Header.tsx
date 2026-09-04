import React from 'react';
import { ShoppingCart, Smartphone, Tablet, Laptop, Monitor, Home, WifiOff, RefreshCw } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useGrocery } from '../context/GroceryContext';
import { DeviceIcon } from '../types';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

const DEVICE_ICONS: Record<DeviceIcon, React.FC<{ className?: string }>> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
  home: Home,
};

export const Header: React.FC<HeaderProps> = () => {
  const { device, openRenameModal } = useDevice();
  const { syncStatus, openSyncModal } = useGrocery();

  const IconComponent = DEVICE_ICONS[device.icon] || Smartphone;

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800/80">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Brand & Live Indicator */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-xs">
            <ShoppingCart className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              CartSync
            </span>
            {/* Minimalist Live Status Dot */}
            <button
              onClick={openSyncModal}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Sync Status (Click for details)"
            >
              {syncStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Live</span>
                </>
              ) : syncStatus === 'connecting' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Syncing</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-zinc-400" />
                  <span className="text-[10px] text-zinc-500">Offline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Device Attribution Pill */}
        <button
          onClick={openRenameModal}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-zinc-200/60 dark:border-zinc-700/60 transition-all text-xs font-medium group"
          title="Device Name (Tap to customize)"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-xs shrink-0"
            style={{ backgroundColor: device.color }}
          >
            <IconComponent className="w-3 h-3" />
          </div>
          <span className="text-zinc-700 dark:text-zinc-300 max-w-[110px] truncate text-[12px] group-hover:text-zinc-900 dark:group-hover:text-white">
            {device.name}
          </span>
        </button>
      </div>
    </header>
  );
};
