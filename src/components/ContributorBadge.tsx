import React, { useState, useRef, useEffect } from 'react';
import { Users, X } from 'lucide-react';
import { GroceryItem } from '../types';
import { useDevice } from '../context/DeviceContext';

interface ContributorBadgeProps {
  item: GroceryItem;
}

export const ContributorBadge: React.FC<ContributorBadgeProps> = ({ item }) => {
  const { device, activeHouseholdDevices } = useDevice();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isPopoverOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPopoverOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Primary creator profile
  const creatorDev = item.completed && item.completedBy ? item.completedBy : item.addedBy;
  const matchedCreator = creatorDev?.deviceId
    ? activeHouseholdDevices.find((d) => d.id === creatorDev.deviceId) ||
      (device.id === creatorDev.deviceId ? device : null)
    : null;

  const creatorName = matchedCreator?.name || creatorDev?.deviceName || 'Household';
  const creatorColor = matchedCreator?.color || creatorDev?.color || '#10b981';

  // Contributor stack (subsequent incrementing devices)
  const contributors = item.contributors || [];
  const hasContributors = contributors.length > 0;

  // Calculate primary creator's allocated count
  const subsequentTotalCount = contributors.reduce((acc, c) => acc + c.count, 0);
  const creatorCount = Math.max(1, item.quantity - subsequentTotalCount);

  // Top (most recent) contributor for the pill
  const latestContributor = hasContributors ? contributors[contributors.length - 1] : null;
  const latestMatched = latestContributor
    ? activeHouseholdDevices.find((d) => d.id === latestContributor.deviceId) ||
      (device.id === latestContributor.deviceId ? device : null)
    : null;

  const latestColor = latestMatched?.color || latestContributor?.color || '#3b82f6';
  const latestTotalSubsequentQty = subsequentTotalCount;

  return (
    <div
      ref={popoverRef}
      className="relative inline-flex items-center"
      onClick={(e) => {
        // Prevent opening parent card's edit sheet
        e.stopPropagation();
      }}
    >
      {/* Tap badge area to toggle detailed popover */}
      <button
        type="button"
        onClick={() => setIsPopoverOpen(!isPopoverOpen)}
        className="inline-flex items-center gap-1.5 px-1.5 py-0.5 -mx-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer group"
        title="View contributor breakdown"
        aria-label="View contributor breakdown"
      >
        {/* Primary Author Dot & Name */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0 shadow-2xs"
            style={{ backgroundColor: creatorColor }}
          />
          <span className="truncate max-w-[110px] sm:max-w-[180px] font-medium text-[10px] text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
            {creatorName}
          </span>
        </div>

        {/* Contributing Device Increment Pill (e.g. "+1" or "+2") */}
        {hasContributors && (
          <span
            className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-bold rounded-full text-white shadow-2xs transition-transform group-hover:scale-105"
            style={{ backgroundColor: latestColor }}
          >
            +{latestTotalSubsequentQty}
          </span>
        )}
      </button>

      {/* Glassmorphic Minimal Popover for Contributor Breakdown */}
      {isPopoverOpen && (
        <div
          role="dialog"
          aria-label="Contributor Breakdown"
          className="absolute left-0 bottom-full mb-2 z-50 w-64 p-3 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] font-semibold text-slate-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contributor Breakdown</span>
            </div>
            <button
              type="button"
              onClick={() => setIsPopoverOpen(false)}
              className="p-0.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-2 space-y-1.5 text-xs">
            {/* Primary Creator Row */}
            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: creatorColor }}
                />
                <span className="truncate text-slate-300">
                  Added by <strong className="text-white font-semibold">{creatorName}</strong>
                </span>
              </div>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-200 shrink-0">
                {creatorCount}
              </span>
            </div>

            {/* Subsequent Contributor Layers */}
            {contributors.map((c, idx) => {
              const matched = activeHouseholdDevices.find((d) => d.id === c.deviceId) ||
                (device.id === c.deviceId ? device : null);
              const name = matched?.name || c.deviceName || 'Device';
              const color = matched?.color || c.color || '#3b82f6';

              return (
                <div key={`${c.deviceId}_${idx}`} className="flex items-center justify-between gap-2 py-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-slate-300">
                      + <strong className="text-white font-semibold">{name}</strong>
                    </span>
                  </div>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    +{c.count}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Total Item Quantity</span>
            <span className="font-bold text-white text-xs">{item.quantity}</span>
          </div>
        </div>
      )}
    </div>
  );
};
