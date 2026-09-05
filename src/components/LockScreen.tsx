import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Delete, Home, Fingerprint, Sparkles, KeyRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CartSyncLogo } from './CartSyncLogo';

export const LockScreen: React.FC = () => {
  const {
    isLocked,
    hasPinSet,
    householdName,
    householdKey,
    setHouseholdKey,
    unlock,
    unlockWithBiometrics,
    isBiometricsSupported,
    isBiometricsActive,
  } = useAuth();

  const [pinInput, setPinInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isBiometricPrompting, setIsBiometricPrompting] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [keyInput, setKeyInput] = useState(householdKey);

  // Trigger biometric prompt on load if enrolled and active
  useEffect(() => {
    if (hasPinSet && isLocked && isBiometricsActive) {
      // Short delay for smooth modal mount
      const timer = setTimeout(() => {
        handleBiometricScan();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [hasPinSet, isLocked, isBiometricsActive]);

  // Only show LockScreen if a PIN is actually configured AND the app is locked
  if (!hasPinSet || !isLocked) return null;

  const triggerShake = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeyPress = (digit: string) => {
    setErrorMessage('');
    if (pinInput.length < 8) {
      const next = pinInput + digit;
      setPinInput(next);
      if (next.length >= 4) {
        const success = unlock(next);
        if (success) {
          setPinInput('');
        } else if (next.length === 4) {
          triggerShake('Incorrect PIN');
          setTimeout(() => setPinInput(''), 400);
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMessage('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleBiometricScan = async () => {
    if (isBiometricPrompting) return;
    setIsBiometricPrompting(true);
    setErrorMessage('');
    try {
      const success = await unlockWithBiometrics();
      if (!success) {
        setErrorMessage('Biometric scan canceled or failed');
      }
    } catch (_) {
      setErrorMessage('Biometric authentication failed');
    } finally {
      setIsBiometricPrompting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-slate-900/95 text-white backdrop-blur-2xl animate-in fade-in duration-200">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <CartSyncLogo size={28} />
          <span className="font-bold text-sm tracking-tight text-white/90">CartSync</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setKeyInput(householdKey);
              setIsKeyModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-[11px] font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Household Server Key (PSK)"
          >
            <KeyRound className="w-3 h-3 text-emerald-400" />
            <span>{householdKey ? 'Key Set' : 'Server Key'}</span>
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-emerald-400">
            <Home className="w-3 h-3" />
            <span>{householdName}</span>
          </div>
        </div>
      </div>

      {/* Main Lock Display & Dots */}
      <div
        className={`w-full max-w-xs flex flex-col items-center text-center space-y-4 my-auto transition-transform ${
          isShaking ? 'animate-shake' : ''
        }`}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-1">
            {isBiometricsActive ? (
              <Fingerprint className="w-8 h-8 stroke-[2.2] animate-pulse" />
            ) : (
              <Lock className="w-8 h-8 stroke-[2.2]" />
            )}
          </div>
          {isBiometricsActive && (
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-slate-900 shadow-sm">
              <Sparkles className="w-2.5 h-2.5 stroke-[3]" />
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white">
            Enter Household PIN
          </h1>
          <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
            {isBiometricsActive
              ? 'Touch fingerprint sensor or enter your 4-digit PIN'
              : 'Keep your shared lists private & synchronized'}
          </p>
        </div>

        {/* PIN Indicators (4 dots) */}
        <div className="flex items-center justify-center gap-3.5 py-3">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < pinInput.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 scale-110 shadow-md shadow-emerald-500/40 ring-2 ring-emerald-400/30'
                    : 'bg-slate-700/80 border border-slate-600/80'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMessage && (
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Numeric Keypad (1 - 9, Delete, 0, Biometrics) */}
      <div className="w-full max-w-xs space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/60 active:scale-95 transition-all text-xl font-bold text-white shadow-xs flex items-center justify-center cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* Delete Button */}
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-700 border border-transparent hover:border-slate-700/60 active:scale-95 transition-all text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            title="Delete digit"
            aria-label="Delete digit"
          >
            <Delete className="w-5 h-5" />
          </button>

          {/* Zero Button */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/60 active:scale-95 transition-all text-xl font-bold text-white shadow-xs flex items-center justify-center cursor-pointer"
          >
            0
          </button>

          {/* Biometrics Fingerprint Trigger Button */}
          {isBiometricsActive ? (
            <button
              type="button"
              onClick={handleBiometricScan}
              className="h-14 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 border border-emerald-500/40 active:scale-95 transition-all text-emerald-400 flex flex-col items-center justify-center cursor-pointer group shadow-lg shadow-emerald-500/10"
              title="Unlock with Fingerprint / Touch ID"
              aria-label="Unlock with Fingerprint"
            >
              <Fingerprint className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span className="text-[9px] font-bold tracking-tight uppercase mt-0.5">Scan</span>
            </button>
          ) : isBiometricsSupported ? (
            <div className="h-14 flex items-center justify-center text-slate-600 text-xs" />
          ) : (
            <div className="h-14" />
          )}
        </div>
      </div>

      {/* Quick Household Server Key Setup Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl max-w-xs w-full p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Household Secret Key</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Pre-shared Bearer token matching <code className="text-emerald-300 font-mono">HOUSEHOLD_SECRET</code> on your server.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setHouseholdKey(keyInput.trim());
                setIsKeyModalOpen(false);
              }}
              className="space-y-3"
            >
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="Enter secret key..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:font-sans focus:outline-hidden focus:border-emerald-500"
              />
              <div className="flex items-center justify-between pt-1">
                {householdKey ? (
                  <button
                    type="button"
                    onClick={() => {
                      setKeyInput('');
                      setHouseholdKey('');
                      setIsKeyModalOpen(false);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
