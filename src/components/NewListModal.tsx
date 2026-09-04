import React, { useState } from 'react';
import { X, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Create New List
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Add a new shopping list or store category
            </p>
          </div>
          <button
            onClick={closeNewListModal}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              List Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Trader Joe's, Target, Party Supplies"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
              maxLength={40}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Weekend groceries, snacks & treats"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
              maxLength={60}
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Choose Icon
            </label>
            <div className="grid grid-cols-4 gap-2">
              {LIST_ICONS.map(({ name: iconName, icon: Icon, label }) => (
                <button
                  type="button"
                  key={iconName}
                  onClick={() => setSelectedIcon(iconName)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                    selectedIcon === iconName
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 shadow-xs'
                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Color Accent
            </label>
            <div className="flex items-center gap-2.5">
              {LIST_COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform hover:scale-110 ${
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
              className="px-4 py-2 text-sm font-medium rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 transition-all"
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
