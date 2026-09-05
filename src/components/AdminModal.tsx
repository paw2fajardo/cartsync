import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  KeyRound,
  Lock,
  Smartphone,
  Users,
  Sparkles,
  Database,
  Trash2,
  Fingerprint,
  Clock,
  Home,
  Layers,
  Download,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';
import { useGrocery } from '../context/GroceryContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';

type AdminTab = 'access' | 'devices' | 'rules' | 'database';

export const AdminModal: React.FC = () => {
  const {
    isAdminModalOpen,
    closeAdminModal,
    isAdmin,
    adminPinConfigured,
    hasPinSet,
    promoteToAdmin,
    setAdminMasterPin,
    removePin,
    householdName,
    setHouseholdName,
    householdKey,
    setHouseholdKey,
    autoLockMinutes,
    setAutoLockMinutes,
    isBiometricsSupported,
    isBiometricsActive,
    enableBiometrics,
    disableBiometrics,
    purgeDevice,
    revokeAdmin,
  } = useAuth();

  const { device, activeHouseholdDevices } = useDevice();
  const {
    lists,
    items,
    autoListRules,
    openCategoryModal,
    openAutoListRulesModal,
  } = useGrocery();

  // Intercept back button to close admin modal
  useModalBackNavigation(isAdminModalOpen, closeAdminModal, 'admin-modal');

  useBodyScrollLock(isAdminModalOpen);

  const [activeTab, setActiveTab] = useState<AdminTab>('access');
  const [adminPinInput, setAdminPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [hName, setHName] = useState(householdName);
  const [newMasterPin, setNewMasterPin] = useState('');
  const [currentMasterPin, setCurrentMasterPin] = useState('');
  const [keyInput, setKeyInput] = useState(householdKey);
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  React.useEffect(() => {
    if (isAdminModalOpen) {
      setHName(householdName);
      setKeyInput(householdKey);
      setFeedbackMsg(null);
      setUnlockError('');
      setAdminPinInput('');
      setNewMasterPin('');
      setCurrentMasterPin('');
      setIsResetConfirmOpen(false);
    }
  }, [isAdminModalOpen, householdName, householdKey]);

  if (!isAdminModalOpen) return null;

  const handleSaveHouseholdKey = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = keyInput.trim();
    setHouseholdKey(clean);
    setFeedbackMsg({
      type: 'success',
      text: clean
        ? 'Household Bearer key updated. Sync client re-authenticated.'
        : 'Household key cleared. Client returned to open mode.',
    });
  };

  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    if (!adminPinInput) return;
    const ok = promoteToAdmin(adminPinInput);
    if (ok) {
      setAdminPinInput('');
    } else {
      setUnlockError('Incorrect Master PIN.');
    }
  };

  const handleUpdateMasterPin = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    if (newMasterPin.length < 4) {
      setFeedbackMsg({ type: 'error', text: 'Master PIN must be at least 4 digits.' });
      return;
    }

    const success = setAdminMasterPin(newMasterPin, (hasPinSet || adminPinConfigured) ? currentMasterPin : undefined);
    if (success) {
      setFeedbackMsg({ type: 'success', text: 'Admin Master PIN successfully saved & synchronized!' });
      setNewMasterPin('');
      setCurrentMasterPin('');
    } else {
      setFeedbackMsg({ type: 'error', text: 'Current Master PIN is incorrect.' });
    }
  };

  const handleRemoveMasterPin = () => {
    if (!currentMasterPin) {
      setFeedbackMsg({ type: 'error', text: 'Enter current PIN to remove Master PIN protection.' });
      return;
    }
    const success = removePin(currentMasterPin);
    if (success) {
      setFeedbackMsg({ type: 'success', text: 'Master PIN lock removed.' });
      setCurrentMasterPin('');
    } else {
      setFeedbackMsg({ type: 'error', text: 'Current PIN is incorrect.' });
    }
  };

  const handleSaveHouseholdName = (e: React.FormEvent) => {
    e.preventDefault();
    setHouseholdName(hName);
    setFeedbackMsg({ type: 'success', text: 'Household name updated and broadcast to all devices.' });
  };

  const handleToggleBiometrics = async () => {
    if (isBiometricsActive) {
      disableBiometrics();
      setFeedbackMsg({ type: 'success', text: 'Biometric fingerprint unlock disabled for this device.' });
    } else {
      setBiometricLoading(true);
      setFeedbackMsg(null);
      const res = await enableBiometrics(device.name || householdName);
      setBiometricLoading(false);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: 'Fingerprint / Biometric unlock successfully enabled!' });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Biometric enrollment failed.' });
      }
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      app: 'CartSync',
      version: 2,
      exportedAt: new Date().toISOString(),
      householdName,
      lists,
      items,
      autoListRules,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cartsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedbackMsg({ type: 'success', text: 'Database backup downloaded successfully.' });
  };

  const handleExecuteReset = async () => {
    setIsResetting(true);
    try {
      const headers: Record<string, string> = {};
      if (householdKey) {
        headers['Authorization'] = `Bearer ${householdKey}`;
      }
      const res = await fetch('/api/reset', { method: 'POST', headers });
      if (res.ok) {
        setFeedbackMsg({ type: 'success', text: 'Database reset to fresh defaults.' });
        setIsResetConfirmOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        setFeedbackMsg({ type: 'error', text: 'Failed to reset database.' });
      }
    } catch (_) {
      setFeedbackMsg({ type: 'error', text: 'Network error during reset.' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-850 border-t sm:border border-slate-200/90 dark:border-slate-700/90 rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 pb-safe animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
        {/* Top Handle on Mobile */}
        <div className="sm:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-750 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Admin Control Center
                </h2>
                {isAdmin ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Lock className="w-3 h-3" />
                    <span>Locked</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage access security, devices, and household system settings
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeAdminModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gated Unlock Prompt if Not Admin */}
        {!isAdmin && adminPinConfigured ? (
          <div className="p-6 space-y-4 my-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 mx-auto flex items-center justify-center shadow-lg shadow-amber-500/10">
                <Lock className="w-6 h-6 stroke-[2]" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Enter Master PIN to Access
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Admin settings are protected to prevent unauthorized changes from public visitors.
              </p>
            </div>

            <form onSubmit={handleAdminUnlock} className="max-w-xs mx-auto space-y-3">
              <input
                type="password"
                inputMode="numeric"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                placeholder="Enter 4-digit Master PIN"
                className="w-full px-4 py-2.5 rounded-xl text-center text-lg tracking-widest font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                maxLength={8}
                autoFocus
              />

              {unlockError && (
                <div className="text-xs font-semibold text-rose-500 text-center animate-in fade-in">
                  {unlockError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Unlock Control Center
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="flex px-4 pt-3 border-b border-slate-200/80 dark:border-slate-800 gap-1 overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab('access')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'access'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Access & Lock</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('devices')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'devices'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Devices ({activeHouseholdDevices.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'rules'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Rules ({autoListRules.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`flex items-center gap-1.5 px-3 py-2 border-b-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  activeTab === 'database'
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Maintenance</span>
              </button>
            </div>

            {/* Notification Feedback */}
            {feedbackMsg && (
              <div className="mx-4 mt-3">
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    feedbackMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {feedbackMsg.text}
                </div>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {/* TAB 1: ACCESS & LOCK SECURITY */}
              {activeTab === 'access' && (
                <div className="space-y-4">
                  {/* Master PIN Configuration */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Household Master PIN
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasPinSet || adminPinConfigured ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        {hasPinSet || adminPinConfigured ? 'Active Protection' : 'Not Set (Public)'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      When active, anyone visiting CartSync via public URL must enter this PIN (or scan their fingerprint) to view or edit lists.
                    </p>

                    <form onSubmit={handleUpdateMasterPin} className="space-y-2.5 pt-1">
                      {(hasPinSet || adminPinConfigured) && (
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Current Master PIN
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            value={currentMasterPin}
                            onChange={(e) => setCurrentMasterPin(e.target.value)}
                            placeholder="Enter current PIN"
                            className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            maxLength={8}
                            required
                          />
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {hasPinSet || adminPinConfigured ? 'New Master PIN' : 'Set Master PIN'}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          value={newMasterPin}
                          onChange={(e) => setNewMasterPin(e.target.value)}
                          placeholder="e.g. 1234"
                          className="w-full px-3 py-1.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          maxLength={8}
                          required
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {hasPinSet || adminPinConfigured ? (
                          <button
                            type="button"
                            onClick={handleRemoveMasterPin}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                          >
                            Remove PIN Lock
                          </button>
                        ) : <div />}

                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                        >
                          {hasPinSet || adminPinConfigured ? 'Update PIN' : 'Activate PIN'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Pre-Shared Key (Bearer Token) Configuration */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Household Pre-Shared Key (Bearer Token)
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${householdKey ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        {householdKey ? 'Key Configured' : 'Open Mode'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Network authentication token. If your sync server has <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">HOUSEHOLD_SECRET</code> configured, entering that token here authorizes all outbound REST and WebSocket synchronization.
                    </p>

                    <form onSubmit={handleSaveHouseholdKey} className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Shared Secret / Auth Token
                        </label>
                        <div className="relative">
                          <input
                            type={isKeyRevealed ? 'text' : 'password'}
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="e.g. household-secret-token"
                            className="w-full pl-3 pr-10 py-2 rounded-xl text-xs font-mono border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:font-sans"
                          />
                          <button
                            type="button"
                            onClick={() => setIsKeyRevealed(!isKeyRevealed)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                            title={isKeyRevealed ? 'Hide secret key' : 'Show secret key'}
                          >
                            {isKeyRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {householdKey ? (
                          <button
                            type="button"
                            onClick={() => {
                              setKeyInput('');
                              setHouseholdKey('');
                              setFeedbackMsg({
                                type: 'success',
                                text: 'Household secret key cleared. Reverted to open mode.',
                              });
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                          >
                            Clear Key
                          </button>
                        ) : <div />}

                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                        >
                          Save Key
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Native Biometric (Fingerprint / Face ID) Setting */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Fingerprint className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Biometric Fingerprint / Face ID Unlock
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isBiometricsActive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                        {isBiometricsActive ? 'Enrolled' : isBiometricsSupported ? 'Available' : 'Unsupported'}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Use your phone or tablet's native biometric sensor (Fingerprint, Touch ID, Face ID, Windows Hello) to unlock CartSync with 1 tap.
                    </p>

                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400">
                        {isBiometricsActive
                          ? 'Fingerprint unlock is currently active on this device.'
                          : 'Enroll this device for instant biometric scan.'}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleBiometrics}
                        disabled={biometricLoading}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95 ${
                          isBiometricsActive
                            ? 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                        }`}
                      >
                        {biometricLoading
                          ? 'Processing...'
                          : isBiometricsActive
                          ? 'Disable Biometrics'
                          : 'Enable Fingerprint'}
                      </button>
                    </div>
                  </div>

                  {/* Auto Lock Timeout */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Inactivity Auto-Lock
                      </span>
                    </div>
                    <select
                      value={autoLockMinutes}
                      onChange={(e) => setAutoLockMinutes(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
                    >
                      <option value={0}>Manual Lock Only (Keep Session Active)</option>
                      <option value={1}>Auto-lock after 1 Minute of Inactivity</option>
                      <option value={5}>Auto-lock after 5 Minutes of Inactivity</option>
                      <option value={15}>Auto-lock after 15 Minutes of Inactivity</option>
                      <option value={60}>Auto-lock after 1 Hour of Inactivity</option>
                    </select>
                  </div>
                </div>
              )}

              {/* TAB 2: HOUSEHOLD & DEVICES ROSTER */}
              {activeTab === 'devices' && (
                <div className="space-y-4">
                  {/* Household Name Form */}
                  <form onSubmit={handleSaveHouseholdName} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Household Name
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hName}
                        onChange={(e) => setHName(e.target.value)}
                        placeholder="e.g. Our Home, Fajardo Family"
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        maxLength={30}
                        required
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  </form>

                  {/* Registered Devices List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Registered Household Devices</span>
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {activeHouseholdDevices.length} Connected
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {activeHouseholdDevices.map((dev) => {
                        const isCurrent = dev.id === device.id;
                        return (
                          <div
                            key={dev.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                                style={{ backgroundColor: dev.color || '#10b981' }}
                              />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {dev.name}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                      This Device
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  ID: {dev.id.slice(0, 16)}... • {dev.icon || 'smartphone'}
                                </span>
                              </div>
                            </div>

                            {!isCurrent && (
                              <button
                                type="button"
                                onClick={() => {
                                  purgeDevice(dev.id);
                                  setFeedbackMsg({ type: 'success', text: `Removed device "${dev.name}".` });
                                }}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Remove device from roster"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: AUTO-RULES & CATEGORIES */}
              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Auto-Routing & Keywords
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeAdminModal();
                          openAutoListRulesModal();
                        }}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Open Rules Manager
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Auto-routing automatically places typed items (e.g. "Gardenia" $\rightarrow$ Supermarket, "Kirkland" $\rightarrow$ Costco) into specific shopping lists.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Category Manager
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          closeAdminModal();
                          openCategoryModal();
                        }}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        Configure Categories
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Manage product categorization keywords and default aisle order across the household.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: DATABASE & SYSTEM MAINTENANCE */}
              {activeTab === 'database' && (
                <div className="space-y-4">
                  {/* Live Database Diagnostics */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        SQLite Database & Sync Engine
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{lists.length}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Lists</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{items.length}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Items</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 col-span-2 sm:col-span-1">
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{activeHouseholdDevices.length}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Devices</div>
                      </div>
                    </div>
                  </div>

                  {/* Backup Export */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        Export JSON Backup
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Download full copy of lists, items, and rules
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </button>
                  </div>

                  {/* Danger Zone: Database Reset */}
                  <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-bold">Database Reset (Danger Zone)</span>
                    </div>
                    <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80">
                      Re-seeds SQLite database with default lists and sample items. All current grocery items will be wiped.
                    </p>

                    {!isResetConfirmOpen ? (
                      <button
                        type="button"
                        onClick={() => setIsResetConfirmOpen(true)}
                        className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
                      >
                        Reset Database...
                      </button>
                    ) : (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 space-y-2 animate-in fade-in">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400 block">
                          Are you completely sure?
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsResetConfirmOpen(false)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteReset}
                            disabled={isResetting}
                            className="px-3 py-1 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                          >
                            {isResetting ? 'Resetting...' : 'Yes, Wipe & Reset'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => {
                  revokeAdmin();
                  closeAdminModal();
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Lock Admin Session
              </button>

              <button
                type="button"
                onClick={closeAdminModal}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
