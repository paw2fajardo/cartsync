import React, { useState } from 'react';
import { X, Smartphone, Tablet, Laptop, Monitor, Home, Check, Sparkles, Lock, Shield, KeyRound, Clock } from 'lucide-react';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { DeviceIcon } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  const {
    hasPinSet,
    setPin,
    removePin,
    householdName,
    setHouseholdName,
    autoLockMinutes,
    setAutoLockMinutes,
  } = useAuth();

  // Prevent background scrolling while modal is open
  useBodyScrollLock(isRenameOpen);
  const [name, setName] = useState(device.name);
  const [color, setColor] = useState(device.color);
  const [icon, setIcon] = useState<DeviceIcon>(device.icon);
  const [hName, setHName] = useState(householdName);

  // Passcode Form State
  const [activeTab, setActiveTab] = useState<'device' | 'security'>('device');
  const [newPin, setNewPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize internal form state whenever modal opens or active device updates
  React.useEffect(() => {
    if (isRenameOpen) {
      setName(device.name);
      setColor(device.color);
      setIcon(device.icon);
      setHName(householdName);
      setSecurityMsg(null);
      setNewPin('');
      setCurrentPin('');
    }
  }, [isRenameOpen, device, householdName]);

  if (!isRenameOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    renameDevice(name, color, icon);
    setHouseholdName(hName);
    closeRenameModal();
  };

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMsg(null);
    if (newPin.length < 4) {
      setSecurityMsg({ type: 'error', text: 'PIN must be at least 4 digits.' });
      return;
    }

    const success = setPin(newPin, hasPinSet ? currentPin : undefined);
    if (success) {
      setSecurityMsg({ type: 'success', text: 'Household PIN successfully updated!' });
      setNewPin('');
      setCurrentPin('');
    } else {
      setSecurityMsg({ type: 'error', text: 'Current PIN is incorrect.' });
    }
  };

  const handleRemovePin = () => {
    if (!currentPin) {
      setSecurityMsg({ type: 'error', text: 'Enter current PIN to remove passcode.' });
      return;
    }
    const success = removePin(currentPin);
    if (success) {
      setSecurityMsg({ type: 'success', text: 'Passcode protection removed.' });
      setCurrentPin('');
    } else {
      setSecurityMsg({ type: 'error', text: 'Current PIN is incorrect.' });
    }
  };

  const SelectedIcon = ICONS.find((i) => i.type === icon)?.icon || Smartphone;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200/80 dark:border-slate-700/80 rounded-t-3xl sm:rounded-3xl max-w-lg sm:max-w-md w-full p-5 sm:p-6 shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] space-y-5 sm:space-y-6 pb-safe animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Mobile Pull Handle */}
        <div className="sm:hidden flex justify-center -mt-1 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Header with Navigation Tabs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-sm transition-all"
                style={{ backgroundColor: activeTab === 'device' ? color : '#10b981' }}
              >
                {activeTab === 'device' ? (
                  <SelectedIcon className="w-5 h-5" />
                ) : (
                  <Shield className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {activeTab === 'device' ? 'Device & Household' : 'Security & PIN'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activeTab === 'device'
                    ? 'Identify who adds & checks off items'
                    : 'Manage household passcode lock'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeRenameModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Device Profile</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Security & Lock</span>
            </button>
          </div>
        </div>

        {activeTab === 'device' ? (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Household Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Household Name
              </label>
              <input
                type="text"
                value={hName}
                onChange={(e) => setHName(e.target.value)}
                placeholder="e.g. Our Home, Fajardo Family"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                maxLength={30}
              />
            </div>

            {/* Name Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Device Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Kitchen iPad, Dad Phone"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                maxLength={30}
                required
              />
            </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
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
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Type Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
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
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
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
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>How your items will look to household members:</span>
            </div>
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700"></div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  Organic Gala Apples (4x)
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
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
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Save Profile
            </button>
          </div>
        </form>
      ) : (
        /* Security & Passcode Panel */
        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-700/70">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasPinSet ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  {hasPinSet ? 'Household PIN Enabled' : 'No PIN Set'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {hasPinSet ? 'CartSync is protected with a global lock' : 'Anyone can access CartSync on this device'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback messages */}
          {securityMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium ${
                securityMsg.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {securityMsg.text}
            </div>
          )}

          {/* PIN Setup / Change Form */}
          <form onSubmit={handleUpdatePin} className="space-y-3.5">
            {hasPinSet && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Current PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="Enter current 4-digit PIN"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  maxLength={8}
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {hasPinSet ? 'New PIN' : 'Set 4-Digit PIN'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="e.g. 1234"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                maxLength={8}
                required
              />
            </div>

            {/* Auto Lock Timer Setting */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Auto-Lock Timeout</span>
              </label>
              <select
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value={0}>Manual Lock Only (Remember Session)</option>
                <option value={1}>After 1 Minute of Inactivity</option>
                <option value={5}>After 5 Minutes of Inactivity</option>
                <option value={15}>After 15 Minutes of Inactivity</option>
                <option value={60}>After 1 Hour of Inactivity</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {hasPinSet ? (
                <button
                  type="button"
                  onClick={handleRemovePin}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 active:scale-95 transition-all cursor-pointer"
                >
                  Remove PIN
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {hasPinSet ? 'Change PIN' : 'Enable PIN'}
              </button>
            </div>
          </form>
        </div>
      )}
      </div>
    </div>
  );
};
