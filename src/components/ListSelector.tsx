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
    <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 scrollbar-none scroll-smooth">
      {lists.map((list) => {
        const Icon = ICON_MAP[list.icon] || ShoppingCart;
        const isActive = list.id === activeListId;
        const itemCount = items.filter((i) => i.listId === list.id && !i.completed).length;

        return (
          <button
            key={list.id}
            type="button"
            onClick={() => setActiveListId(list.id)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 cursor-pointer active:scale-[0.97] ${
              isActive
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 scale-[1.01]'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 stroke-[2.2] ${isActive ? 'text-white' : 'text-zinc-400 dark:text-zinc-500'}`} />
            <span className="tracking-tight">{list.name}</span>
            {itemCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {itemCount}
              </span>
            )}
          </button>
        );
      })}

      <button
        type="button"
        onClick={openNewListModal}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 whitespace-nowrap active:scale-[0.97] transition-all shrink-0 cursor-pointer"
        title="Create new list"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2]" />
        <span>New List</span>
      </button>
    </div>
  );
};
