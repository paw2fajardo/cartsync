import React from 'react';
import { X, Plus, Trash2, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Smartphone, Tablet, Laptop, Monitor, Home, Users } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { DeviceIcon } from '../types';

interface ListSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const DEVICE_ICONS: Record<DeviceIcon, React.FC<{ className?: string }>> = {
  smartphone: Smartphone,
  tablet: Tablet,
  laptop: Laptop,
  monitor: Monitor,
  home: Home,
};

export const ListSidebar: React.FC<ListSidebarProps> = ({ isOpen, onClose }) => {
  const { lists, activeListId, setActiveListId, deleteList, openNewListModal, items } = useGrocery();
  const { activeHouseholdDevices, openRenameModal } = useDevice();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Household Lists
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">
              Manage all grocery & shopping lists
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lists Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 px-2">
            Active Lists ({lists.length})
          </div>

          <div className="space-y-1.5">
            {lists.map((list) => {
              const Icon = ICON_MAP[list.icon] || ShoppingCart;
              const isActive = list.id === activeListId;
              const listItems = items.filter((i) => i.listId === list.id);
              const uncompletedCount = listItems.filter((i) => !i.completed).length;
              const completedCount = listItems.filter((i) => i.completed).length;
              const totalCount = listItems.length;
              const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

              return (
                <div
                  key={list.id}
                  className={`group relative rounded-2xl p-3 border transition-all ${
                    isActive
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200/70 dark:border-zinc-800 hover:bg-zinc-100/80 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div
                    onClick={() => {
                      setActiveListId(list.id);
                      onClose();
                    }}
                    className="cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isActive
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-white">
                            {list.name}
                          </div>
                          {list.description && (
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate max-w-[140px]">
                              {list.description}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-500 text-white'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {uncompletedCount} left
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {totalCount > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-zinc-200 dark:bg-zinc-700 h-1 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-zinc-600 dark:text-zinc-300">
                          <span>{completedCount} of {totalCount} done</span>
                          <span>{progressPct}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete button (if more than 1 list) */}
                  {lists.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete list "${list.name}" and its items?`)) {
                          deleteList(list.id);
                        }
                      }}
                      className="absolute right-2 top-2 p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete list"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              openNewListModal();
              onClose();
            }}
            className="w-full py-2.5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Custom List</span>
          </button>
        </div>

        {/* Footer: Household Devices Presence */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Household Roster</span>
            </div>
            <button
              onClick={openRenameModal}
              className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Configure
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {activeHouseholdDevices.map((dev) => {
              const DevIcon = DEVICE_ICONS[dev.icon] || Smartphone;
              return (
                <div
                  key={dev.id}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 text-[11px] text-zinc-700 dark:text-zinc-300"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: dev.color }}
                  />
                  <DevIcon className="w-3 h-3 text-zinc-400" />
                  <span className="font-medium truncate max-w-[90px]">{dev.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
