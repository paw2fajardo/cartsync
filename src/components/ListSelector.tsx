import React, { useState } from 'react';
import { ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Plus, Trash2 } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { DeleteListModal } from './DeleteListModal';
import { GroceryList } from '../types';

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
  const [deletingList, setDeletingList] = useState<GroceryList | null>(null);

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];
  const canDeleteActive = lists.length > 1;

  return (
    <>
      <div className="flex items-center gap-2 w-full">
        {/* Pinned "+ New List" Button: ALWAYS in-canvas and never scrolled off-screen */}
        <button
          type="button"
          onClick={openNewListModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 whitespace-nowrap active:scale-95 transition-all shrink-0 cursor-pointer shadow-2xs"
          title="Create a new shopping list"
          aria-label="Create new list"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New</span>
        </button>

        {/* Scrollable Horizontal List Pills */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-0.5 scrollbar-none scroll-smooth">
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
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-white/90 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white backdrop-blur-xs'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 stroke-[2.2] ${
                    isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'
                  }`}
                />
                <span className="tracking-tight">{list.name}</span>
                {itemCount > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                    }`}
                  >
                    {itemCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Delete Active List Button (visible directly in canvas when more than 1 list exists) */}
        {canDeleteActive && activeList && (
          <button
            type="button"
            onClick={() => setDeletingList(activeList)}
            className="p-2 rounded-2xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/60 active:scale-95 transition-all shrink-0 cursor-pointer"
            title={`Delete active list "${activeList.name}"`}
            aria-label={`Delete list ${activeList.name}`}
          >
            <Trash2 className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>

      {/* Confirmation Modal with Slider for Non-Empty Lists */}
      <DeleteListModal
        list={deletingList}
        isOpen={Boolean(deletingList)}
        onClose={() => setDeletingList(null)}
      />
    </>
  );
};
