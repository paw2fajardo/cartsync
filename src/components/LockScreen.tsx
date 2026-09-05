import React, { useState } from 'react';
import { Lock, ShieldAlert, KeyRound, Delete, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { CartSyncLogo } from './CartSyncLogo';

export const LockScreen: React.FC = () => {
  const { isLocked, hasPinSet, householdName, unlock, setPin } = useAuth();

  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const isSetupMode = !hasPinSet;
  const [setupStep, setSetupStep] = useState<'create' | 'confirm'>('create');
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  // If already unlocked and not setting up, do not show
  if (!isLocked && hasPinSet) return null;

  const triggerShake = (msg: string) => {
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeyPress = (digit: string) => {
    setErrorMessage('');
    if (isSetupMode) {
      if (setupStep === 'create') {
        if (pinInput.length < 8) {
          const next = pinInput + digit;
          setPinInput(next);
          if (next.length === 4) {
            // Automatically advance to confirm step
            setTimeout(() => {
              setSetupStep('confirm');
              setConfirmPinInput('');
            }, 150);
          }
        }
      } else {
        if (confirmPinInput.length < 8) {
          const next = confirmPinInput + digit;
          setConfirmPinInput(next);
          if (next.length === pinInput.length) {
            // Check match
            if (next === pinInput) {
              setPin(next);
            } else {
              triggerShake('PINs do not match. Try again.');
              setTimeout(() => {
                setSetupStep('create');
                setPinInput('');
                setConfirmPinInput('');
              }, 600);
            }
          }
        }
      }
    } else {
      if (pinInput.length < 8) {
        const next = pinInput + digit;
        setPinInput(next);
        if (next.length >= 4) {
          const success = unlock(next);
          if (success) {
            setPinInput('');
          } else if (next.length === 4) {
            // If it failed on 4 digits, check if user might type longer, but trigger feedback
            triggerShake('Incorrect PIN');
            setTimeout(() => setPinInput(''), 400);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMessage('');
    if (isSetupMode) {
      if (setupStep === 'confirm') {
        setConfirmPinInput((prev) => prev.slice(0, -1));
      } else {
        setPinInput((prev) => prev.slice(0, -1));
      }
    } else {
      setPinInput((prev) => prev.slice(0, -1));
    }
  };

  const currentDisplayLength = isSetupMode
    ? setupStep === 'confirm'
      ? confirmPinInput.length
      : pinInput.length
    : pinInput.length;

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
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-emerald-400">
          <Home className="w-3 h-3" />
          <span>{householdName}</span>
        </div>
      </div>

      {/* Main Lock Display & Dots */}
      <div className={`w-full max-w-xs flex flex-col items-center text-center space-y-4 my-auto transition-transform ${isShaking ? 'animate-shake' : ''}`}>
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-1">
          {isSetupMode ? (
            <KeyRound className="w-8 h-8 stroke-[2.2]" />
          ) : (
            <Lock className="w-8 h-8 stroke-[2.2]" />
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight text-white">
            {isSetupMode
              ? setupStep === 'confirm'
                ? 'Confirm Household PIN'
                : 'Create Household PIN'
              : 'Enter Household PIN'}
          </h1>
          <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
            {isSetupMode
              ? setupStep === 'confirm'
                ? 'Re-enter your 4-digit PIN to confirm'
                : 'Set a 4-digit PIN to secure your grocery lists'
              : 'Keep your shared lists private & synchronized'}
          </p>
        </div>

        {/* PIN Indicators (4 dots) */}
        <div className="flex items-center justify-center gap-3.5 py-3">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = index < currentDisplayLength;
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

      {/* Numeric Keypad (1 - 9, Delete, 0, Action) */}
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

          {/* Setup / Switch Mode Button */}
          {isSetupMode && setupStep === 'confirm' ? (
            <button
              type="button"
              onClick={() => {
                setSetupStep('create');
                setPinInput('');
                setConfirmPinInput('');
              }}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-700 active:scale-95 transition-all text-xs font-semibold text-slate-300 flex items-center justify-center cursor-pointer"
            >
              Back
            </button>
          ) : !hasPinSet ? (
            <button
              type="button"
              onClick={() => {
                // Quick start without PIN
                unlock('');
              }}
              className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 active:bg-slate-700 active:scale-95 transition-all text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer"
            >
              Skip
            </button>
          ) : (
            <div className="h-14" />
          )}
        </div>
      </div>
    </div>
  );
};
