import React, { useState } from 'react';
import { X, Plus, Trash2, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Smartphone, Tablet, Laptop, Monitor, Home, Users } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { DeviceIcon, GroceryList } from '../types';
import { DeleteListModal } from './DeleteListModal';

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
  const { lists, activeListId, setActiveListId, openNewListModal, items } = useGrocery();
  const { activeHouseholdDevices, openRenameModal } = useDevice();
  const [deletingList, setDeletingList] = useState<GroceryList | null>(null);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        />

        {/* Drawer */}
        <div className="relative w-80 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col z-50 animate-in slide-in-from-left duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Household Lists
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage all grocery & shopping lists
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Lists Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
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
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800/60'
                        : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      onClick={() => {
                        setActiveListId(list.id);
                        onClose();
                      }}
                      className="cursor-pointer space-y-1.5 pr-8"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isActive
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {list.name}
                            </div>
                            {list.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
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
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {uncompletedCount} left
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {totalCount > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>{completedCount} of {totalCount} done</span>
                            <span>{progressPct}%</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Touch-Friendly Delete Button (visible on all screens, not hidden behind desktop hover) */}
                    {lists.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingList(list);
                        }}
                        className="absolute right-2.5 top-2.5 p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
                        title={`Delete list "${list.name}"`}
                        aria-label={`Delete list ${list.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                openNewListModal();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 active:scale-95 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-3"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom List</span>
            </button>
          </div>

          {/* Footer: Household Devices Presence */}
          <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                <span>Household Devices</span>
              </div>
              <button
                type="button"
                onClick={openRenameModal}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
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
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: dev.color }}
                    />
                    <DevIcon className="w-3 h-3 text-slate-400" />
                    <span className="font-medium truncate max-w-[90px]">{dev.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Slider Confirmation Modal for Deleting Lists */}
      <DeleteListModal
        list={deletingList}
        isOpen={Boolean(deletingList)}
        onClose={() => setDeletingList(null)}
      />
    </>
  );
};
