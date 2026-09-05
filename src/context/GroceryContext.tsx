import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GroceryItem, GroceryList, ItemCategory, SyncStatus, AutoListRule } from '../types';
import { useDevice } from './DeviceContext';
import {
  getAllLists,
  getAllItems,
  getAllAutoListRules,
  getCachedLists,
  getCachedItems,
  getCachedRules,
  saveItem as idbSaveItem,
  saveList as idbSaveList,
  saveAutoListRule as idbSaveAutoListRule,
  deleteAutoListRuleFromStorage,
  deleteItemFromStorage,
  deleteListFromStorage,
  bulkSaveData,
  LS_INITIALIZED_KEY,
} from '../storage/idb';
import { INITIAL_LISTS, INITIAL_ITEMS, INITIAL_AUTO_LIST_RULES } from '../storage/seedData';
import { syncClient } from '../sync/syncClient';
import { findMatchingAutoListRule } from '../utils/smartCategorizer';
import { resolveItemConflict, resolveItemListConflict } from '../utils/conflictResolver';

interface GroceryContextType {
  lists: GroceryList[];
  activeListId: string;
  setActiveListId: (id: string) => void;
  activeList: GroceryList | undefined;
  items: GroceryItem[];
  activeItems: GroceryItem[];
  completedItems: GroceryItem[];
  autoListRules: AutoListRule[];
  addItem: (
    name: string,
    quantity?: number,
    unit?: string,
    category?: ItemCategory,
    note?: string,
    targetListId?: string
  ) => Promise<GroceryItem>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<GroceryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: (listId?: string) => Promise<void>;
  uncheckAll: (listId?: string) => Promise<void>;
  createList: (name: string, icon?: string, color?: string, description?: string) => Promise<GroceryList>;
  updateList: (id: string, updates: Partial<GroceryList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addAutoListRule: (keyword: string, targetListId: string, category?: ItemCategory) => Promise<AutoListRule>;
  updateAutoListRule: (id: string, updates: Partial<AutoListRule>) => Promise<void>;
  deleteAutoListRule: (id: string) => Promise<void>;
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
  isAutoListRulesModalOpen: boolean;
  openAutoListRulesModal: () => void;
  closeAutoListRulesModal: () => void;
  isCategoryModalOpen: boolean;
  openCategoryModal: () => void;
  closeCategoryModal: () => void;
  activeEditingItemId: string | null;
  setActiveEditingItemId: (id: string | null) => void;
  isQuickAddOptionsOpen: boolean;
  setIsQuickAddOptionsOpen: (open: boolean) => void;
  lastDeletedItem: GroceryItem | null;
  undoLastDelete: () => Promise<void>;
  dismissUndoToast: () => void;
}

const GroceryContext = createContext<GroceryContextType | undefined>(undefined);

const ACTIVE_LIST_STORAGE_KEY = 'cartsync_active_list_id_v1';

export const GroceryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { device } = useDevice();
  const [lists, setLists] = useState<GroceryList[]>(() => {
    const cached = getCachedLists();
    if (cached.length > 0) return cached;
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(LS_INITIALIZED_KEY) === 'true';
    return isInitialized ? [] : INITIAL_LISTS;
  });

  const [items, setItems] = useState<GroceryItem[]>(() => {
    const cached = getCachedItems();
    if (cached.length > 0) return cached;
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(LS_INITIALIZED_KEY) === 'true';
    return isInitialized ? [] : INITIAL_ITEMS;
  });

  const [autoListRules, setAutoListRules] = useState<AutoListRule[]>(() => {
    const cached = getCachedRules();
    if (cached.length > 0) return cached;
    const isInitialized = typeof window !== 'undefined' && localStorage.getItem(LS_INITIALIZED_KEY) === 'true';
    return isInitialized ? [] : INITIAL_AUTO_LIST_RULES;
  });

  const [activeListId, setActiveListIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(ACTIVE_LIST_STORAGE_KEY);
      if (saved) return saved;
    }
    const cached = getCachedLists();
    return cached.length > 0 ? cached[0].id : 'list_supermarket';
  });

  const setActiveListId = useCallback((id: string) => {
    setActiveListIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_LIST_STORAGE_KEY, id);
    }
  }, []);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'All'>('All');
  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAutoListRulesModalOpen, setIsAutoListRulesModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [activeEditingItemId, setActiveEditingItemIdState] = useState<string | null>(null);
  const [isQuickAddOptionsOpen, setIsQuickAddOptionsOpenState] = useState(false);

  const setActiveEditingItemId = useCallback((id: string | null) => {
    setActiveEditingItemIdState(id);
    if (id) {
      // Mutual exclusion: Close Quick Add options tray if item edit opens
      setIsQuickAddOptionsOpenState(false);
    }
  }, []);

  const setIsQuickAddOptionsOpen = useCallback((open: boolean) => {
    setIsQuickAddOptionsOpenState(open);
    if (open) {
      // Mutual exclusion: Close any open inline card edit if Quick Add options tray opens
      setActiveEditingItemIdState(null);
    }
  }, []);

  // Initialize and reconcile data from IndexedDB
  useEffect(() => {
    async function initStorage() {
      const isInitialized = typeof window !== 'undefined' && localStorage.getItem(LS_INITIALIZED_KEY) === 'true';
      let storedLists = await getAllLists();
      let storedItems = await getAllItems();
      let storedRules = await getAllAutoListRules();

      if (!isInitialized && storedLists.length === 0) {
        storedLists = INITIAL_LISTS;
        storedItems = INITIAL_ITEMS;
        storedRules = INITIAL_AUTO_LIST_RULES;
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_INITIALIZED_KEY, 'true');
        }
        await bulkSaveData(storedLists, storedItems, storedRules);
      } else if (storedLists.length > 0) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LS_INITIALIZED_KEY, 'true');
        }
      }

      if (storedLists.length > 0) {
        setLists(storedLists);
        setItems(storedItems);
        setAutoListRules(storedRules);
        setActiveListIdState((prev) => (storedLists.some((l) => l.id === prev) ? prev : storedLists[0].id));
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
        if (remoteState.autoListRules) {
          setAutoListRules(remoteState.autoListRules);
        }
        setLastSyncedAt(remoteState.lastSyncedAt || Date.now());

        setItems((prev) => {
          const resolved = resolveItemListConflict(prev, remoteState.items || []);
          bulkSaveData(remoteState.lists || [], resolved, remoteState.autoListRules);
          return resolved;
        });
      } else if (event.type === 'ITEM_UPSERT' && event.item) {
        const incomingItem = event.item;
        setItems((prev) => {
          const existing = prev.find((i) => i.id === incomingItem.id);
          const resolvedItem = existing ? resolveItemConflict(existing, incomingItem) : incomingItem;
          const idx = prev.findIndex((i) => i.id === resolvedItem.id);
          const next = idx >= 0 ? [...prev] : [resolvedItem, ...prev];
          if (idx >= 0) next[idx] = resolvedItem;
          idbSaveItem(resolvedItem);
          return next;
        });
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
        setAutoListRules((prev) => prev.filter((r) => r.targetListId !== listId));
        deleteListFromStorage(listId);
        setLastSyncedAt(Date.now());
      } else if (event.type === 'AUTO_LIST_RULE_UPSERT' && event.autoListRule) {
        const rule = event.autoListRule;
        setAutoListRules((prev) => {
          const idx = prev.findIndex((r) => r.id === rule.id);
          const next = idx >= 0 ? [...prev] : [...prev, rule];
          if (idx >= 0) next[idx] = rule;
          return next;
        });
        idbSaveAutoListRule(rule);
        setLastSyncedAt(Date.now());
      } else if (event.type === 'AUTO_LIST_RULE_DELETE' && event.deletedRuleId) {
        const ruleId = event.deletedRuleId;
        setAutoListRules((prev) => prev.filter((r) => r.id !== ruleId));
        deleteAutoListRuleFromStorage(ruleId);
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
    const result = await syncClient.httpSync(lists, items, autoListRules);
    if (result) {
      setLists(result.lists);
      const resolved = resolveItemListConflict(items, result.items || []);
      setItems(resolved);
      if (result.autoListRules) setAutoListRules(result.autoListRules);
      setLastSyncedAt(result.lastSyncedAt || Date.now());
      setSyncStatus('connected');
      await bulkSaveData(result.lists, resolved, result.autoListRules);
    }
  }, [lists, items, autoListRules]);

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
    note?: string,
    targetListId?: string
  ): Promise<GroceryItem> => {
    // Determine destination list: explicit targetListId > auto-list rule > current activeListId
    let destinationListId = targetListId;
    if (!destinationListId) {
      const matchedRule = findMatchingAutoListRule(name, autoListRules);
      if (matchedRule && lists.some((l) => l.id === matchedRule.targetListId)) {
        destinationListId = matchedRule.targetListId;
      } else {
        destinationListId = activeListId;
      }
    }

    const now = Date.now();
    const newItem: GroceryItem = {
      id: `item_${now}_${Math.random().toString(36).substring(2, 7)}`,
      listId: destinationListId,
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
      createdAt: now,
      contentUpdatedAt: now,
      updatedAt: now,
    };

    // Optimistic local update
    setItems((prev) => [newItem, ...prev]);
    await idbSaveItem(newItem);

    // If item was auto-routed to a different list, automatically switch active view so user sees it
    if (destinationListId !== activeListId) {
      setActiveListId(destinationListId);
    }

    // Broadcast to household sync
    syncClient.broadcastItemUpsert(newItem);

    return newItem;
  };

  const toggleItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const willBeCompleted = !target.completed;
    const now = Date.now();
    const updated: GroceryItem = {
      ...target,
      completed: willBeCompleted,
      completedAt: willBeCompleted ? now : null,
      completedBy: willBeCompleted
        ? {
            deviceId: device.id,
            deviceName: device.name,
            color: device.color,
          }
        : null,
      updatedAt: now,
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

    const now = Date.now();
    const isContentEdit =
      updates.name !== undefined ||
      updates.quantity !== undefined ||
      updates.unit !== undefined ||
      updates.category !== undefined ||
      updates.note !== undefined ||
      updates.listId !== undefined;

    const updated: GroceryItem = {
      ...target,
      ...updates,
      contentUpdatedAt: isContentEdit ? now : (target.contentUpdatedAt ?? target.updatedAt),
      updatedAt: now,
    };

    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await idbSaveItem(updated);
    syncClient.broadcastItemUpsert(updated);
  };

  const [lastDeletedItem, setLastDeletedItem] = useState<GroceryItem | null>(null);
  const undoTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissUndoToast = useCallback(() => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }
    setLastDeletedItem(null);
  }, []);

  const deleteItem = async (id: string) => {
    const itemToDelete = items.find((i) => i.id === id);
    if (itemToDelete) {
      // Set for undo toast and schedule auto-dismiss in 5s
      setLastDeletedItem(itemToDelete);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setLastDeletedItem(null);
        undoTimeoutRef.current = null;
      }, 5000);
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItemFromStorage(id);
    syncClient.broadcastItemDelete(id);
  };

  const undoLastDelete = async () => {
    if (!lastDeletedItem) return;
    const restored = { ...lastDeletedItem, updatedAt: Date.now() };
    dismissUndoToast();

    setItems((prev) => {
      const exists = prev.some((i) => i.id === restored.id);
      return exists ? prev : [restored, ...prev];
    });
    await idbSaveItem(restored);
    syncClient.broadcastItemUpsert(restored);
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
    setAutoListRules((prev) => prev.filter((r) => r.targetListId !== id));

    if (activeListId === id) {
      setActiveListId(remainingLists[0].id);
    }

    await deleteListFromStorage(id);
    syncClient.broadcastListDelete(id);
  };

  // Auto-List Rules Operations
  const addAutoListRule = async (
    keyword: string,
    targetListId: string,
    category?: ItemCategory
  ): Promise<AutoListRule> => {
    const cleanKw = keyword.trim().toLowerCase();
    const existing = autoListRules.find((r) => r.keyword === cleanKw);
    if (existing) {
      const updated = { ...existing, targetListId, category };
      await updateAutoListRule(existing.id, updated);
      return updated;
    }

    const newRule: AutoListRule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      keyword: cleanKw,
      targetListId,
      category,
      createdAt: Date.now(),
    };

    setAutoListRules((prev) => [...prev, newRule]);
    await idbSaveAutoListRule(newRule);
    syncClient.broadcastAutoListRuleUpsert(newRule);

    return newRule;
  };

  const updateAutoListRule = async (id: string, updates: Partial<AutoListRule>) => {
    const target = autoListRules.find((r) => r.id === id);
    if (!target) return;

    const updated: AutoListRule = {
      ...target,
      ...updates,
      keyword: updates.keyword ? updates.keyword.trim().toLowerCase() : target.keyword,
    };

    setAutoListRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    await idbSaveAutoListRule(updated);
    syncClient.broadcastAutoListRuleUpsert(updated);
  };

  const deleteAutoListRule = async (id: string) => {
    setAutoListRules((prev) => prev.filter((r) => r.id !== id));
    await deleteAutoListRuleFromStorage(id);
    syncClient.broadcastAutoListRuleDelete(id);
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
        autoListRules,
        addItem,
        toggleItem,
        updateItem,
        deleteItem,
        clearCompleted,
        uncheckAll,
        createList,
        updateList,
        deleteList,
        addAutoListRule,
        updateAutoListRule,
        deleteAutoListRule,
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
        isAutoListRulesModalOpen,
        openAutoListRulesModal: () => setIsAutoListRulesModalOpen(true),
        closeAutoListRulesModal: () => setIsAutoListRulesModalOpen(false),
        isCategoryModalOpen,
        openCategoryModal: () => setIsCategoryModalOpen(true),
        closeCategoryModal: () => setIsCategoryModalOpen(false),
        activeEditingItemId,
        setActiveEditingItemId,
        isQuickAddOptionsOpen,
        setIsQuickAddOptionsOpen,
        lastDeletedItem,
        undoLastDelete,
        dismissUndoToast,
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
