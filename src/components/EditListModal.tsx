import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Check, AlertCircle } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { GroceryList } from '../types';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { usePullDownDismiss } from '../hooks/usePullDownDismiss';
import { PullDownHandle } from './PullDownHandle';

export const LIST_ICONS = [
  { name: 'shopping-cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'store', icon: Store, label: 'Store' },
  { name: 'box', icon: Box, label: 'Box' },
  { name: 'pill', icon: Pill, label: 'Pharmacy' },
  { name: 'apple', icon: Apple, label: 'Produce' },
  { name: 'carrot', icon: Carrot, label: 'Market' },
  { name: 'coffee', icon: Coffee, label: 'Cafe' },
  { name: 'sparkles', icon: Sparkles, label: 'Special' },
];

export const LIST_COLORS = [
  { name: 'Emerald', id: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-500' },
  { name: 'Amber', id: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-500' },
  { name: 'Rose', id: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-500' },
  { name: 'Blue', id: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-500' },
  { name: 'Cyan', id: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-500' },
  { name: 'Purple', id: 'purple', bg: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-500' },
];

interface EditListModalProps {
  list: GroceryList | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditListModal: React.FC<EditListModalProps> = ({ list, isOpen, onClose }) => {
  const { updateList, items } = useGrocery();

  // Prevent background scrolling while modal is open
  useBodyScrollLock(isOpen);

  // Pull-down-to-dismiss for mobile bottom sheet
  const pullDown = usePullDownDismiss({
    onDismiss: onClose,
    enabled: isOpen,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('shopping-cart');
  const [selectedColor, setSelectedColor] = useState('emerald');
  const [touched, setTouched] = useState(false);

  // Sync state whenever active list changes or modal opens
  useEffect(() => {
    if (list) {
      setName(list.name || '');
      setDescription(list.description || '');
      setSelectedIcon(list.icon || 'shopping-cart');
      setSelectedColor(list.color || 'emerald');
      setTouched(false);
    }
  }, [list, isOpen]);

  if (!isOpen || !list) return null;

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;
  const isDirty =
    trimmedName !== list.name ||
    description.trim() !== (list.description || '') ||
    selectedIcon !== list.icon ||
    selectedColor !== list.color;

  const activeItemCount = items.filter((i) => i.listId === list.id && !i.completed).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setTouched(true);
      return;
    }

    await updateList(list.id, {
      name: trimmedName,
      icon: selectedIcon,
      color: selectedColor,
      description: description.trim() || undefined,
    });

    onClose();
  };

  const SelectedIconComp = LIST_ICONS.find((i) => i.name === selectedIcon)?.icon || ShoppingCart;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-list-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={pullDown.backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        {...pullDown.containerProps}
        className="bg-white dark:bg-slate-850 border-t sm:border border-slate-200/80 dark:border-slate-700/90 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-6 pt-2 sm:pt-6 shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] ring-1 ring-black/5 dark:ring-white/10 space-y-5 max-h-[90vh] overflow-y-auto pb-safe animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200"
      >
        <PullDownHandle
          onPointerDown={pullDown.handlePointerDown}
          isDragging={pullDown.isDragging}
        />
        
        {/* Header */}
        <div
          {...pullDown.headerProps}
          className="flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        >
          <div>
            <h2 id="edit-list-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Edit List
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Customize list name, visual icon, and theme accent
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Interactive Preview Pill */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            <span>Live List Preview</span>
            <span>Selector Appearance</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Pill Simulation */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20">
              <SelectedIconComp className="w-3.5 h-3.5 stroke-[2.2] text-white" />
              <span className="tracking-tight font-bold">
                {trimmedName || <span className="opacity-60 italic">Untitled List</span>}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-white">
                {activeItemCount}
              </span>
            </div>

            {/* Description Sub-preview */}
            <div className="flex-1 text-right truncate">
              <span className="text-xs text-slate-500 dark:text-slate-400 italic truncate block">
                {description.trim() || 'No description'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* List Name Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-list-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                List Name <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {name.length}/40
              </span>
            </div>
            <input
              id="edit-list-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!touched) setTouched(true);
              }}
              onBlur={() => setTouched(true)}
              placeholder="e.g., Trader Joe's, Costco, Farmers Market"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden transition-all ${
                touched && !isValid
                  ? 'border-rose-500 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500'
              }`}
              maxLength={40}
              required
              autoFocus
            />
            {touched && !isValid && (
              <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-0.5 animate-in fade-in duration-150">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>List name cannot be empty.</span>
              </div>
            )}
          </div>

          {/* Description Field (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="edit-list-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description (Optional)
              </label>
              <span className="text-[11px] text-slate-400">
                {description.length}/60
              </span>
            </div>
            <input
              id="edit-list-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Weekend groceries, pantry stock, dinner party"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              maxLength={60}
            />
          </div>

          {/* Icon Selector Grid */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              List Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LIST_ICONS.map(({ name: iconName, icon: Icon, label }) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    type="button"
                    key={iconName}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-0.5 stroke-[2]" />
                    <span className="text-[10px] font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Color Accent
            </label>
            <div className="flex items-center gap-3 pt-1">
              {LIST_COLORS.map((c) => {
                const isSelected = selectedColor === c.id;
                return (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSelectedColor(c.id)}
                    className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                      isSelected ? 'ring-2 ring-offset-2 ring-emerald-500 dark:ring-offset-slate-900 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                    aria-label={`Select color ${c.name}`}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || !isDirty}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                isValid && isDirty
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
              }`}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
