import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GroceryItem, GroceryList, ItemCategory, SyncStatus } from '../types';
import { useDevice } from './DeviceContext';
import {
  getAllLists,
  getAllItems,
  saveItem as idbSaveItem,
  saveList as idbSaveList,
  deleteItemFromStorage,
  deleteListFromStorage,
  bulkSaveData,
} from '../storage/idb';
import { INITIAL_LISTS, INITIAL_ITEMS } from '../storage/seedData';
import { syncClient } from '../sync/syncClient';

interface GroceryContextType {
  lists: GroceryList[];
  activeListId: string;
  setActiveListId: (id: string) => void;
  activeList: GroceryList | undefined;
  items: GroceryItem[];
  activeItems: GroceryItem[];
  completedItems: GroceryItem[];
  addItem: (name: string, quantity?: number, unit?: string, category?: ItemCategory, note?: string) => Promise<GroceryItem>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<GroceryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: (listId?: string) => Promise<void>;
  uncheckAll: (listId?: string) => Promise<void>;
  createList: (name: string, icon?: string, color?: string, description?: string) => Promise<GroceryList>;
  updateList: (id: string, updates: Partial<GroceryList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  triggerManualSync: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: ItemCategory | 'All';
  setSelectedCategory: (cat: ItemCategory | 'All') => void;
  isNewListModalOpen: boolean;
  openNewListModal: () => void;
  closeNewListModal: () => void;
  isSyncModalOpen: boolean;
  openSyncModal: () => void;
  closeSyncModal: () => void;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

export const GroceryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { device } = useDevice();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [activeListId, setActiveListId] = useState<string>('list_supermarket');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Initialize data from local-first storage
  useEffect(() => {
    async function initStorage() {
      let storedLists = await getAllLists();
      let storedItems = await getAllItems();

      if (storedLists.length === 0) {
        storedLists = INITIAL_LISTS;
        storedItems = INITIAL_ITEMS;
        await bulkSaveData(storedLists, storedItems);
      }

      setLists(storedLists);
      setItems(storedItems);
      if (storedLists.length > 0 && !storedLists.some((l) => l.id === activeListId)) {
        setActiveListId(storedLists[0].id);
      }
    }

    initStorage();
  }, []);

  // Sync client subscription
  useEffect(() => {
    const unsubStatus = syncClient.onStatusChange((status) => {
      setSyncStatus(status);
    });

    const unsubSync = syncClient.onSync((event) => {
      if (event.type === 'SYNC_STATE' && event.state) {
        const remoteState = event.state;
        setLists(remoteState.lists || []);
        setItems(remoteState.items || []);
        setLastSyncedAt(remoteState.lastSyncedAt || Date.now());
        bulkSaveData(remoteState.lists || [], remoteState.items || []);
      } else if (event.type === 'ITEM_UPSERT' && event.item) {
        const item = event.item;
        setItems((prev) => {
          const idx = prev.findIndex((i) => i.id === item.id);
          const next = idx >= 0 ? [...prev] : [item, ...prev];
          if (idx >= 0) next[idx] = item;
          return next;
        });
        idbSaveItem(item);
        setLastSyncedAt(Date.now());
      } else if (event.type === 'ITEM_DELETE' && event.deletedItemId) {
        const id = event.deletedItemId;
        setItems((prev) => prev.filter((i) => i.id !== id));
        deleteItemFromStorage(id);
        setLastSyncedAt(Date.now());
      } else if (event.type === 'LIST_UPSERT' && event.list) {
        const list = event.list;
        setLists((prev) => {
          const idx = prev.findIndex((l) => l.id === list.id);
          const next = idx >= 0 ? [...prev] : [...prev, list];
          if (idx >= 0) next[idx] = list;
          return next;
        });
        idbSaveList(list);
        setLastSyncedAt(Date.now());
      } else if (event.type === 'LIST_DELETE' && event.deletedListId) {
        const listId = event.deletedListId;
        setLists((prev) => prev.filter((l) => l.id !== listId));
        setItems((prev) => prev.filter((i) => i.listId !== listId));
        deleteListFromStorage(listId);
        setLastSyncedAt(Date.now());
      }
    });

    return () => {
      unsubStatus();
      unsubSync();
    };
  }, []);

  const triggerManualSync = useCallback(async () => {
    setSyncStatus('connecting');
    syncClient.connect();
    const result = await syncClient.httpSync(lists, items);
    if (result) {
      setLists(result.lists);
      setItems(result.items);
      setLastSyncedAt(result.lastSyncedAt || Date.now());
      setSyncStatus('connected');
      await bulkSaveData(result.lists, result.items);
    }
  }, [lists, items]);

  const activeList = lists.find((l) => l.id === activeListId) || lists[0];

  const filteredItems = items.filter((item) => {
    if (item.listId !== activeListId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchNote = item.note?.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchDevice = item.addedBy.deviceName.toLowerCase().includes(q);
      if (!matchName && !matchNote && !matchCat && !matchDevice) return false;
    }
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const activeItems = filteredItems.filter((i) => !i.completed);
  const completedItems = filteredItems.filter((i) => i.completed);

  const addItem = async (
    name: string,
    quantity: number = 1,
    unit?: string,
    category: ItemCategory = 'Other',
    note?: string
  ): Promise<GroceryItem> => {
    const newItem: GroceryItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      listId: activeListId,
      name: name.trim(),
      quantity: quantity || 1,
      unit: unit || undefined,
      category,
      note: note ? note.trim() : undefined,
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: device.id,
        deviceName: device.name,
        color: device.color,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Optimistic local update
    setItems((prev) => [newItem, ...prev]);
    await idbSaveItem(newItem);

    // Broadcast to household sync
    syncClient.broadcastItemUpsert(newItem);

    return newItem;
  };

  const toggleItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const willBeCompleted = !target.completed;
    const updated: GroceryItem = {
      ...target,
      completed: willBeCompleted,
      completedAt: willBeCompleted ? Date.now() : null,
      completedBy: willBeCompleted
        ? {
            deviceId: device.id,
            deviceName: device.name,
            color: device.color,
          }
        : null,
      updatedAt: Date.now(),
    };

    // Confetti celebration when checking off the last remaining item on a list!
    if (willBeCompleted) {
      const remainingUncompleted = items.filter(
        (i) => i.listId === target.listId && !i.completed && i.id !== id
      );
      if (remainingUncompleted.length === 0) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10b981', '#34d399', '#6ee7b7', '#059669'],
          });
        } catch (_) {}
      }
    }

    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await idbSaveItem(updated);
    syncClient.broadcastItemUpsert(updated);
  };

  const updateItem = async (id: string, updates: Partial<GroceryItem>) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const updated: GroceryItem = {
      ...target,
      ...updates,
      updatedAt: Date.now(),
    };

    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await idbSaveItem(updated);
    syncClient.broadcastItemUpsert(updated);
  };

  const deleteItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItemFromStorage(id);
    syncClient.broadcastItemDelete(id);
  };

  const clearCompleted = async (listId: string = activeListId) => {
    const toDelete = items.filter((i) => i.listId === listId && i.completed);
    setItems((prev) => prev.filter((i) => !(i.listId === listId && i.completed)));

    for (const item of toDelete) {
      await deleteItemFromStorage(item.id);
      syncClient.broadcastItemDelete(item.id);
    }
  };

  const uncheckAll = async (listId: string = activeListId) => {
    const toUpdate = items.filter((i) => i.listId === listId && i.completed);
    for (const item of toUpdate) {
      const updated: GroceryItem = {
        ...item,
        completed: false,
        completedAt: null,
        completedBy: null,
        updatedAt: Date.now(),
      };
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      await idbSaveItem(updated);
      syncClient.broadcastItemUpsert(updated);
    }
  };

  const createList = async (
    name: string,
    icon: string = 'shopping-cart',
    color: string = 'emerald',
    description?: string
  ): Promise<GroceryList> => {
    const newList: GroceryList = {
      id: `list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      icon,
      color,
      description: description?.trim() || '',
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setLists((prev) => [...prev, newList]);
    setActiveListId(newList.id);
    await idbSaveList(newList);
    syncClient.broadcastListUpsert(newList);

    return newList;
  };

  const updateList = async (id: string, updates: Partial<GroceryList>) => {
    const target = lists.find((l) => l.id === id);
    if (!target) return;

    const updated: GroceryList = {
      ...target,
      ...updates,
      updatedAt: Date.now(),
    };

    setLists((prev) => prev.map((l) => (l.id === id ? updated : l)));
    await idbSaveList(updated);
    syncClient.broadcastListUpsert(updated);
  };

  const deleteList = async (id: string) => {
    if (lists.length <= 1) return; // Keep at least one list

    const remainingLists = lists.filter((l) => l.id !== id);
    setLists(remainingLists);
    setItems((prev) => prev.filter((i) => i.listId !== id));

    if (activeListId === id) {
      setActiveListId(remainingLists[0].id);
    }

    await deleteListFromStorage(id);
    syncClient.broadcastListDelete(id);
  };

  return (
    <GroceryContext.Provider
      value={{
        lists,
        activeListId,
        setActiveListId,
        activeList,
        items,
        activeItems,
        completedItems,
        addItem,
        toggleItem,
        updateItem,
        deleteItem,
        clearCompleted,
        uncheckAll,
        createList,
        updateList,
        deleteList,
        syncStatus,
        lastSyncedAt,
        triggerManualSync,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        isNewListModalOpen,
        openNewListModal: () => setIsNewListModalOpen(true),
        closeNewListModal: () => setIsNewListModalOpen(false),
        isSyncModalOpen,
        openSyncModal: () => setIsSyncModalOpen(true),
        closeSyncModal: () => setIsSyncModalOpen(false),
      }}
    >
      {children}
    </GroceryContext.Provider>
  );
};

export function useGrocery(): GroceryContextType {
  const context = useContext(GroceryContext);
  if (!context) {
    throw new Error('useGrocery must be used within a GroceryProvider');
  }
  return context;
}
