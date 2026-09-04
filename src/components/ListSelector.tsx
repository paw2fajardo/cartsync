import React from 'react';
import { ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Plus } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'shopping-cart': ShoppingCart,
  store: Store,
  box: Box,
  pill: Pill,
  sparkles: Sparkles,
  apple: Apple,
  carrot: Carrot,
  coffee: Coffee,
};

export const ListSelector: React.FC = () => {
  const { lists, activeListId, setActiveListId, items, openNewListModal } = useGrocery();

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
      {lists.map((list) => {
        const Icon = ICON_MAP[list.icon] || ShoppingCart;
        const isActive = list.id === activeListId;
        const itemCount = items.filter((i) => i.listId === list.id && !i.completed).length;

        return (
          <button
            key={list.id}
            onClick={() => setActiveListId(list.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
              isActive
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25 scale-[1.02]'
                : 'bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} />
            <span>{list.name}</span>
            {itemCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {itemCount}
              </span>
            )}
          </button>
        );
      })}

      <button
        onClick={openNewListModal}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 whitespace-nowrap transition-all shrink-0"
        title="Create new list"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New List</span>
      </button>
    </div>
  );
};
