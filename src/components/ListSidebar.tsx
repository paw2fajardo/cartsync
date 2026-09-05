import React, { useState } from 'react';
import { X, Plus, Trash2, Pencil, ShoppingCart, Store, Box, Pill, Sparkles, Apple, Carrot, Coffee, Smartphone, Tablet, Laptop, Monitor, Home, Users, Layers, Shield } from 'lucide-react';
import { useGrocery } from '../context/GroceryContext';
import { useDevice } from '../context/DeviceContext';
import { useAuth } from '../context/AuthContext';
import { DeviceIcon, GroceryList } from '../types';
import { DeleteListModal } from './DeleteListModal';
import { EditListModal } from './EditListModal';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

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
  const { lists, activeListId, setActiveListId, openNewListModal, openAutoListRulesModal, openCategoryModal, items } = useGrocery();
  const { device, activeHouseholdDevices, openRenameModal } = useDevice();
  const { householdName, openAdminModal } = useAuth();
  const [deletingList, setDeletingList] = useState<GroceryList | null>(null);
  const [editingList, setEditingList] = useState<GroceryList | null>(null);

  const DeviceActiveIcon = DEVICE_ICONS[device.icon] || Smartphone;

  // Prevent background scrolling while sidebar drawer is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        {/* Backdrop */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/50 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        />

        {/* Drawer: Full window width on mobile, responsive max-w on desktop */}
        <div className="relative w-full sm:w-96 sm:max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] flex flex-col z-50 animate-in slide-in-from-left duration-200">
          {/* Drawer Header with Active Device Profile Banner */}
          <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Menu & Lists
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {householdName}
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

            {/* Current Device Profile Pill */}
            <button
              type="button"
              onClick={() => {
                openRenameModal();
                onClose();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700/80 transition-all text-xs font-medium cursor-pointer group shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-xl flex items-center justify-center text-white text-xs shadow-xs shrink-0"
                  style={{ backgroundColor: device.color }}
                >
                  <DeviceActiveIcon className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {device.name}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    This Device • Tap to customize
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Profile
              </span>
            </button>
          </div>

          {/* Lists Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
              Active Lists ({lists.length})
            </div>

            <div className="space-y-2">
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
                    className={`rounded-2xl p-3 border transition-all ${
                      isActive
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-300/90 dark:border-emerald-700/80 shadow-xs'
                        : 'bg-slate-50/80 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100/80 dark:hover:bg-slate-800'
                    }`}
                  >
                    {/* Top Row: Icon, Name/Description, Badge, and Action Buttons */}
                    <div className="flex items-center justify-between gap-2">
                      {/* Clickable list selector region */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveListId(list.id);
                          onClose();
                        }}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer group"
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                            isActive
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {list.name}
                            </span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          {list.description ? (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {list.description}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              {uncompletedCount} active {uncompletedCount === 1 ? 'item' : 'items'}
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Right Area: Count pill + Edit & Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-200/90 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {uncompletedCount} left
                        </span>

                        {/* Edit List Button */}
                        <button
                          type="button"
                          onClick={() => setEditingList(list)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 active:scale-95 transition-all cursor-pointer"
                          title={`Edit list "${list.name}"`}
                          aria-label={`Edit list ${list.name}`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete List Button */}
                        {lists.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDeletingList(list)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 active:scale-95 transition-all cursor-pointer"
                            title={`Delete list "${list.name}"`}
                            aria-label={`Delete list ${list.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar (if items exist in list) */}
                    {totalCount > 0 && (
                      <div className="space-y-1 pt-2.5 mt-1 border-t border-slate-200/60 dark:border-slate-700/50">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                          <span>{completedCount} of {totalCount} completed</span>
                          <span className="font-semibold">{progressPct}%</span>
                        </div>
                      </div>
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

            <button
              type="button"
              onClick={() => {
                openCategoryModal();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 active:scale-95 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
            >
              <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Category Manager</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openAutoListRulesModal();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 border border-amber-200/80 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 active:scale-95 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
            >
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Auto-Route Keyword Rules</span>
            </button>

            <button
              type="button"
              onClick={() => {
                openAdminModal();
                onClose();
              }}
              className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 active:scale-95 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer mt-2"
            >
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Admin Control Center</span>
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

      {/* Edit List Modal */}
      <EditListModal
        list={editingList}
        isOpen={Boolean(editingList)}
        onClose={() => setEditingList(null)}
      />

      {/* Slider Confirmation Modal for Deleting Lists */}
      <DeleteListModal
        list={deletingList}
        isOpen={Boolean(deletingList)}
        onClose={() => setDeletingList(null)}
      />
    </>
  );
};
