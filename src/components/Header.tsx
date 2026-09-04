import React from 'react';
import { Smartphone, Tablet, Laptop, Monitor, Home, WifiOff, RefreshCw } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useGrocery } from '../context/GroceryContext';
import { DeviceIcon } from '../types';
import { CartSyncLogo } from './CartSyncLogo';
import { ThemeToggle } from './ThemeToggle';

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
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Live Indicator */}
        <div className="flex items-center gap-2.5">
          <CartSyncLogo size={32} />
          <div className="flex items-center gap-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100">
              CartSync
            </span>

            {/* Minimalist Live Status Dot */}
            <button
              onClick={openSyncModal}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 transition-colors cursor-pointer"
              title="Sync Status (Click for details)"
            >
              {syncStatus === 'connected' ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Live</span>
                </>
              ) : syncStatus === 'connecting' ? (
                <>
                  <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">Syncing</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-2.5 h-2.5 text-slate-400" />
                  <span className="text-[10px] text-slate-500">Offline</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Theme Toggle & Device Attribution Pill */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle (System Auto / Dark / Light) */}
          <ThemeToggle />

          {/* Device Attribution Pill */}
          <button
            onClick={openRenameModal}
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/70 dark:border-slate-700/70 transition-all text-xs font-medium group cursor-pointer active:scale-95"
            title="Device Name (Tap to customize)"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] shadow-xs shrink-0"
              style={{ backgroundColor: device.color }}
            >
              <IconComponent className="w-3 h-3" />
            </div>
            <span className="text-slate-700 dark:text-slate-300 max-w-[100px] truncate text-[12px] font-medium group-hover:text-slate-900 dark:group-hover:text-white">
              {device.name}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
