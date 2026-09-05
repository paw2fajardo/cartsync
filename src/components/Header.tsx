import React from 'react';
import { Smartphone, Tablet, Laptop, Monitor, Home, WifiOff, RefreshCw, Lock, Menu } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useGrocery } from '../context/GroceryContext';
import { useAuth } from '../context/AuthContext';
import { DeviceIcon } from '../types';
import { CartSyncLogo } from './CartSyncLogo';
import { ThemeToggle } from './ThemeToggle';

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
  const { hasPinSet, householdName, lock } = useAuth();

  const IconComponent = DEVICE_ICONS[device.icon] || Smartphone;

  return (
    <header className="sticky top-0 z-30 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl border-b border-slate-200/70 dark:border-slate-800/80 transition-colors">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        {/* Left: Brand Logo & Household Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <CartSyncLogo size={32} />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-slate-100 leading-none shrink-0">
                CartSync
              </span>
              <button
                type="button"
                onClick={openRenameModal}
                className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline truncate cursor-pointer"
                title="Household Name (Tap to edit/unlock)"
              >
                {householdName}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Live Sync Badge, Theme Switcher, Quick Lock, and Main Burger Menu Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Minimalist Live Status Dot */}
          <button
            type="button"
            onClick={openSyncModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700/70 transition-colors cursor-pointer"
            title="Sync Status (Click for details)"
            aria-label="Sync Status"
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

          {/* Quick Lock Button (Visible if PIN configured) */}
          {hasPinSet && (
            <button
              type="button"
              onClick={lock}
              className="p-2 rounded-full text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/60 dark:border-slate-700/60 transition-all duration-200 active:scale-90 cursor-pointer"
              title="Lock CartSync"
              aria-label="Lock App"
            >
              <Lock className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Consolidated Burger Stack Menu Trigger (Opens complete navigation drawer) */}
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer group"
            title="Open Menu & Household Lists"
            aria-label="Open Navigation Menu"
          >
            <div
              className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
              style={{ backgroundColor: device.color }}
            >
              <IconComponent className="w-2.5 h-2.5" />
            </div>
            <Menu className="w-4 h-4 stroke-[2.3] group-hover:scale-105 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
};
