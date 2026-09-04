import React, { useState } from 'react';
import { X, Smartphone, Tablet, Laptop, Monitor, Home, Check, Sparkles } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { DeviceIcon } from '../types';

const PRESETS = [
  'Dad Phone',
  'Mom iPhone',
  'Kitchen iPad',
  'Pantry Tablet',
  'Living Room TV',
  'Office Laptop',
];

const COLORS = [
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
];

const ICONS: { type: DeviceIcon; label: string; icon: React.FC<{ className?: string }> }[] = [
  { type: 'smartphone', label: 'Phone', icon: Smartphone },
  { type: 'tablet', label: 'Tablet', icon: Tablet },
  { type: 'laptop', label: 'Laptop', icon: Laptop },
  { type: 'monitor', label: 'Desktop', icon: Monitor },
  { type: 'home', label: 'Home Hub', icon: Home },
];

export const DeviceModal: React.FC = () => {
  const { device, renameDevice, isRenameOpen, closeRenameModal } = useDevice();
  const [name, setName] = useState(device.name);
  const [color, setColor] = useState(device.color);
  const [icon, setIcon] = useState<DeviceIcon>(device.icon);

  if (!isRenameOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    renameDevice(name, color, icon);
    closeRenameModal();
  };

  const SelectedIcon = ICONS.find((i) => i.type === icon)?.icon || Smartphone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm transition-all"
              style={{ backgroundColor: color }}
            >
              <SelectedIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Device Attribution
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Identify who adds & checks off items
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeRenameModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Device Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Kitchen iPad, Dad Phone"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
              maxLength={30}
              required
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Quick Suggestions
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setName(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer active:scale-95 ${
                    name === preset
                      ? 'bg-emerald-500 text-white font-medium shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Device Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {ICONS.map(({ type, label, icon: Icon }) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => setIcon(type)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    icon === type
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Badge Color Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Attribution Color
            </label>
            <div className="flex items-center gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.hex}
                  onClick={() => setColor(c.hex)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 shadow-xs"
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {color === c.hex && <Check className="w-4 h-4 text-white stroke-[2.5]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>How your items will look to household members:</span>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 px-3 py-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-zinc-300 dark:border-zinc-700"></div>
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Organic Gala Apples (4x)
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                <span>Added by {name || 'This Device'}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={closeRenameModal}
              className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Save Attribution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
