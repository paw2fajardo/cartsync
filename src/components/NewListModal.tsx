import React, { useState } from 'react';
import { X, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useModalBackNavigation } from '../hooks/useModalBackNavigation';
import { usePullDownDismiss } from '../hooks/usePullDownDismiss';
import { PullDownHandle } from './PullDownHandle';

const LIST_ICONS = [
  { name: 'shopping-cart', icon: ShoppingCart, label: 'Cart' },
  { name: 'store', icon: Store, label: 'Store' },
  { name: 'box', icon: Box, label: 'Box' },
  { name: 'pill', icon: Pill, label: 'Pharmacy' },
  { name: 'apple', icon: Apple, label: 'Produce' },
  { name: 'carrot', icon: Carrot, label: 'Market' },
  { name: 'coffee', icon: Coffee, label: 'Cafe' },
  { name: 'sparkles', icon: Sparkles, label: 'Special' },
];

const LIST_COLORS = [
  { name: 'Emerald', id: 'emerald', bg: 'bg-emerald-500' },
  { name: 'Amber', id: 'amber', bg: 'bg-amber-500' },
  { name: 'Rose', id: 'rose', bg: 'bg-rose-500' },
  { name: 'Blue', id: 'blue', bg: 'bg-blue-500' },
  { name: 'Cyan', id: 'cyan', bg: 'bg-cyan-500' },
  { name: 'Purple', id: 'purple', bg: 'bg-purple-500' },
];

export const NewListModal: React.FC = () => {
  const { isNewListModalOpen, closeNewListModal, createList } = useGrocery();

  // Intercept back button to close new list modal
  useModalBackNavigation(isNewListModalOpen, closeNewListModal, 'new-list-modal');

  // Prevent background scrolling while modal is open
  useBodyScrollLock(isNewListModalOpen);

  // Pull-down-to-dismiss for mobile bottom sheet
  const pullDown = usePullDownDismiss({
    onDismiss: closeNewListModal,
    enabled: isNewListModalOpen,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('shopping-cart');
  const [selectedColor, setSelectedColor] = useState('emerald');

  if (!isNewListModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createList(name.trim(), selectedIcon, selectedColor, description.trim());
    setName('');
    setDescription('');
    closeNewListModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={pullDown.backdropStyle}
      onClick={(e) => {
        if (e.target === e.currentTarget) closeNewListModal();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create New List"
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
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Create New List
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add a new shopping list or store category
            </p>
          </div>
          <button
            type="button"
            onClick={closeNewListModal}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              List Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Trader Joe's, Target, Party Supplies"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              maxLength={40}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Weekend groceries, snacks & treats"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              maxLength={60}
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Choose Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LIST_ICONS.map(({ name: iconName, icon: Icon, label }) => (
                <button
                  type="button"
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    selectedIcon === iconName
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700/70 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5 stroke-[2]" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Color Accent
            </label>
            <div className="flex items-center gap-2.5">
              {LIST_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer ${
                    selectedColor === c.id ? 'ring-2 ring-offset-2 ring-emerald-500' : ''
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3">
            <button
              type="button"
              onClick={closeNewListModal}
              className="px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
