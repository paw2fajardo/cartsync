import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { GroceryItem, GroceryList, ItemCategory, SyncStatus, AutoListRule, DeviceItemHistory } from '../types';
import { useDevice } from './DeviceContext';
import {
  getAllLists,
  getAllItems,
  getAllAutoListRules,
  getCachedLists,
  getCachedItems,
  getCachedRules,
  getCachedHistory,
  getDeviceHistoryFromStorage,
  saveItem as idbSaveItem,
  saveList as idbSaveList,
  saveAutoListRule as idbSaveAutoListRule,
  saveDeviceHistoryItem,
  saveDeviceHistoryBatch,
  deleteDeviceHistoryItem,
  deleteAutoListRuleFromStorage,
  deleteItemFromStorage,
  deleteListFromStorage,
  bulkSaveData,
  purgeAndReplaceLocalData,
  getOutbox,
  LS_INITIALIZED_KEY,
} from '../storage/idb';
import { INITIAL_LISTS, INITIAL_ITEMS, INITIAL_AUTO_LIST_RULES } from '../storage/seedData';
import { syncClient } from '../sync/syncClient';
import { findMatchingAutoListRule } from '../utils/smartCategorizer';
import { resolveItemConflict, resolveItemListConflict } from '../utils/conflictResolver';
import { findDuplicateItem } from '../utils/itemMatching';
import { pushContributor, popContributor } from '../utils/contributorStack';
import { normalizeCleanName } from '../utils/nameNormalization';
import { EventToastMessage } from '../types';
import { computeDatabaseDiff, DatabaseDiffResult } from '../utils/databaseDiff';


interface GroceryContextType {
  lists: GroceryList[];
  activeListId: string;
  setActiveListId: (id: string) => void;
  activeList: GroceryList | undefined;
  items: GroceryItem[];
  activeItems: GroceryItem[];
  completedItems: GroceryItem[];
  unavailableItems: GroceryItem[];
  autoListRules: AutoListRule[];
  deviceItemHistory: DeviceItemHistory[];
  addItem: (
    name: string,
    quantity?: number,
    unit?: string,
    category?: ItemCategory,
    note?: string,
    targetListId?: string
  ) => Promise<GroceryItem>;
  incrementItem: (id: string, qty?: number) => Promise<void>;
  decrementItem: (id: string, qty?: number) => Promise<void>;
  toggleItem: (id: string) => Promise<void>;
  updateItem: (id: string, updates: Partial<GroceryItem>) => Promise<void>;
  markItemUnavailable: (id: string) => Promise<void>;
  restoreUnavailableItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearCompleted: (listId?: string) => Promise<void>;
  uncheckAll: (listId?: string) => Promise<void>;
  finishShoppingTrip: (moveRemainingToUnavailable: boolean, listId?: string) => Promise<void>;
  addFromHistory: (historyItem: DeviceItemHistory) => Promise<GroceryItem>;
  removeDeviceHistoryItem: (id: string) => Promise<void>;
  createList: (name: string, icon?: string, color?: string, description?: string) => Promise<GroceryList>;
  updateList: (id: string, updates: Partial<GroceryList>) => Promise<void>;
  deleteList: (id: string) => Promise<void>;
  addAutoListRule: (keyword: string, targetListId: string, category?: ItemCategory) => Promise<AutoListRule>;
  updateAutoListRule: (id: string, updates: Partial<AutoListRule>) => Promise<void>;
  deleteAutoListRule: (id: string) => Promise<void>;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;
  triggerManualSync: () => Promise<void>;
  pullServerDatabase: () => Promise<void>;
  checkDatabaseDiff: () => Promise<DatabaseDiffResult>;
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
  isShopModeOpen: boolean;
  openShopMode: () => void;
  closeShopMode: () => void;
  isFinishShoppingModalOpen: boolean;
  openFinishShoppingModal: () => void;
  closeFinishShoppingModal: () => void;
  isReplenishmentDrawerOpen: boolean;
  openReplenishmentDrawer: () => void;
  closeReplenishmentDrawer: () => void;
  activeEditingItemId: string | null;
  setActiveEditingItemId: (id: string | null) => void;
  isQuickAddOptionsOpen: boolean;
  setIsQuickAddOptionsOpen: (open: boolean) => void;
  lastDeletedItem: GroceryItem | null;
  undoLastDelete: () => Promise<void>;
  dismissUndoToast: () => void;
  activeToast: EventToastMessage | null;
  dismissToast: () => void;
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

  const [deviceItemHistory, setDeviceItemHistory] = useState<DeviceItemHistory[]>(() => {
    return getCachedHistory(device?.name);
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
  const [isShopModeOpen, setIsShopModeOpen] = useState(false);
  const [isFinishShoppingModalOpen, setIsFinishShoppingModalOpen] = useState(false);
  const [isReplenishmentDrawerOpen, setIsReplenishmentDrawerOpen] = useState(false);
  const [activeEditingItemId, setActiveEditingItemIdState] = useState<string | null>(null);
  const [isQuickAddOptionsOpen, setIsQuickAddOptionsOpenState] = useState(false);
  const [activeToast, setActiveToast] = useState<EventToastMessage | null>(null);
  const toastTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const locallyDeletedItemIdsRef = React.useRef<Set<string>>(new Set());

  const openFinishShoppingModal = useCallback(() => setIsFinishShoppingModalOpen(true), []);
  const closeFinishShoppingModal = useCallback(() => setIsFinishShoppingModalOpen(false), []);
  const openReplenishmentDrawer = useCallback(() => setIsReplenishmentDrawerOpen(true), []);
  const closeReplenishmentDrawer = useCallback(() => setIsReplenishmentDrawerOpen(false), []);

  // Refresh history whenever active device name changes
  useEffect(() => {
    if (device?.name) {
      getDeviceHistoryFromStorage(device.name).then((hist) => {
        setDeviceItemHistory(hist);
      });
    }
  }, [device?.name]);


  const dismissToast = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setActiveToast(null);
  }, []);

  const showToast = useCallback((toast: EventToastMessage) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    setActiveToast(toast);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

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

      const storedHist = await getDeviceHistoryFromStorage(device.name);
      if (storedHist.length > 0) {
        setDeviceItemHistory(storedHist);
      }
    }

    initStorage();
  }, [device.name]);

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
        if (remoteState.deviceItemHistory) {
          setDeviceItemHistory((prev) => {
            const map = new Map<string, DeviceItemHistory>();
            prev.forEach((h) => map.set(`${h.deviceName.toLowerCase()}:::${h.cleanName.toLowerCase()}`, h));
            remoteState.deviceItemHistory?.forEach((h) =>
              map.set(`${h.deviceName.toLowerCase()}:::${h.cleanName.toLowerCase()}`, h)
            );
            const merged = Array.from(map.values());
            saveDeviceHistoryBatch(merged).catch(() => {});
            return merged;
          });
        }
        setLastSyncedAt(remoteState.lastSyncedAt || Date.now());

        setItems((prev) => {
          // Identify any items created locally in the offline outbox
          const outbox = getOutbox();
          const pendingNewItems = outbox
            .filter((o) => o.type === 'ITEM_UPSERT' && o.payload && o.payload.id)
            .map((o) => o.payload as GroceryItem);

          const resolved = resolveItemListConflict(prev, remoteState.items || []);
          // Exclude any items that were deleted on this client locally so they do not resurrect
          let filtered = locallyDeletedItemIdsRef.current.size > 0
            ? resolved.filter((i) => !locallyDeletedItemIdsRef.current.has(i.id))
            : resolved;

          // Merge any pending outbox items so offline adds are never lost
          if (pendingNewItems.length > 0) {
            const currentIds = new Set(filtered.map((i) => i.id));
            const toAdd = pendingNewItems.filter((i) => !currentIds.has(i.id));
            if (toAdd.length > 0) {
              filtered = [...toAdd, ...filtered];
            }
          }

          bulkSaveData(remoteState.lists || [], filtered, remoteState.autoListRules, remoteState.deviceItemHistory);
          return filtered;
        });
      } else if (event.type === 'ITEM_UPSERT' && event.item) {
        const incomingItem = event.item;
        setItems((prev) => {
          const existing = prev.find((i) => i.id === incomingItem.id);
          const isBrandNewItem = !existing;

          const resolvedItem = existing ? resolveItemConflict(existing, incomingItem) : incomingItem;
          const idx = prev.findIndex((i) => i.id === resolvedItem.id);
          const next = idx >= 0 ? [...prev] : [resolvedItem, ...prev];
          if (idx >= 0) next[idx] = resolvedItem;
          idbSaveItem(resolvedItem);

          // Trigger toast ONLY for brand-new item creation from another device
          // Strictly suppress toasts for quantity updates / inline edits
          if (isBrandNewItem && incomingItem.addedBy.deviceId !== device.id) {
            showToast({
              id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'created',
              item: resolvedItem,
              actorDevice: resolvedItem.addedBy,
              timestamp: Date.now(),
            });
          }

          // If the item was added or contributed by any device sharing this deviceName, record to local deviceItemHistory
          const clean = normalizeCleanName(resolvedItem.name);
          const authorDevName = (resolvedItem.addedBy?.deviceName || '').trim().toLowerCase();
          const curDevName = (device.name || '').trim().toLowerCase();
          const isContributor = (resolvedItem.contributors || []).some(
            (c) => (c.deviceName || '').trim().toLowerCase() === curDevName
          );
          if (clean && (authorDevName === curDevName || isContributor)) {
            const histItem: DeviceItemHistory = {
              id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              deviceName: device.name,
              cleanName: clean,
              category: resolvedItem.category || 'Other',
              lastUnit: resolvedItem.unit,
              lastCompletedAt: resolvedItem.createdAt || Date.now(),
              purchaseCount: 1,
            };
            saveDeviceHistoryItem(histItem).catch(() => {});
            setDeviceItemHistory((prev) => {
              const idx = prev.findIndex(
                (h) => h.deviceName.toLowerCase() === curDevName && h.cleanName.toLowerCase() === clean.toLowerCase()
              );
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], lastCompletedAt: histItem.lastCompletedAt, category: resolvedItem.category || next[idx].category };
                return next;
              }
              return [histItem, ...prev];
            });
          }

          return next;
        });
        setLastSyncedAt(Date.now());
      } else if (event.type === 'ITEM_DELETE' && event.deletedItemId) {
        const id = event.deletedItemId;
        setItems((prev) => {
          const deleted = prev.find((i) => i.id === id);
          if (deleted) {
            // Toast notification for remote deletion (if not deleted locally)
            showToast({
              id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              type: 'deleted',
              item: deleted,
              timestamp: Date.now(),
            });
          }
          return prev.filter((i) => i.id !== id);
        });
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

    const unsubReconnect = syncClient.onReconnect(() => {
      // Upon reconnect, if device has items, trigger a quick background sync check
      syncClient.send({
        type: 'DEVICE_PING',
        deviceId: device.id,
        timestamp: Date.now(),
        payload: device,
      });
    });

    return () => {
      unsubStatus();
      unsubSync();
      unsubReconnect();
    };
  }, [device]);

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

  /**
   * Manual Pull of the Server Database:
   * Non-negotiable requirement: Device must be online.
   * 1. Verifies internet connection.
   * 2. Purges current local IndexedDB and localStorage cache completely.
   * 3. Fetches fresh server database state via HTTP GET /api/state.
   * 4. Populates local storage cleanly with authoritative server state.
   * 5. Replays any pending offline outbox items to both local state and server.
   */
  const pullServerDatabase = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Device is offline. An active internet connection is required to pull the server database.');
    }

    setSyncStatus('connecting');

    try {
      // 1. Fetch fresh authoritative state from server
      const serverState = await syncClient.fetchServerState();

      // 2. Identify any pending offline actions in the persistent outbox
      const outbox = getOutbox();
      const pendingNewItems = outbox
        .filter((o) => o.type === 'ITEM_UPSERT' && o.payload && o.payload.id)
        .map((o) => o.payload as GroceryItem);

      // 3. Purge local storage and replace with fresh server state
      let mergedItems = serverState.items || [];
      if (pendingNewItems.length > 0) {
        const serverIds = new Set(mergedItems.map((i) => i.id));
        const toAdd = pendingNewItems.filter((i) => !serverIds.has(i.id));
        mergedItems = [...toAdd, ...mergedItems];
      }

      await purgeAndReplaceLocalData(
        serverState.lists || [],
        mergedItems,
        serverState.autoListRules || [],
        serverState.deviceItemHistory || []
      );

      // 4. Update React state cleanly
      setLists(serverState.lists || []);
      setItems(mergedItems);
      if (serverState.autoListRules) setAutoListRules(serverState.autoListRules);
      if (serverState.deviceItemHistory) setDeviceItemHistory(serverState.deviceItemHistory);
      setLastSyncedAt(serverState.lastSyncedAt || Date.now());
      setSyncStatus('connected');

      // 5. Connect WebSocket and replay outbox actions to the server
      syncClient.connect();
      syncClient.flushOutbox();
    } catch (err) {
      setSyncStatus(navigator.onLine ? 'disconnected' : 'offline');
      throw err;
    }
  }, []);

  /**
   * Deterministically compare local database state with server database state
   */
  const checkDatabaseDiff = useCallback(async (): Promise<DatabaseDiffResult> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Device is offline. An active connection is required to compare against the server database.');
    }

    const serverState = await syncClient.fetchServerState();
    const outbox = getOutbox();

    return computeDatabaseDiff(
      {
        lists,
        items,
        autoListRules,
      },
      serverState,
      outbox
    );
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

  const activeItems = filteredItems.filter((i) => !i.completed && i.status !== 'unavailable');
  const completedItems = filteredItems.filter((i) => i.completed && i.status !== 'unavailable');
  const unavailableItems = filteredItems.filter((i) => i.status === 'unavailable');

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

    // 1. Check for intelligent duplicate matching against active, uncompleted items on target list
    const existingDuplicate = findDuplicateItem(name, items, destinationListId);

    if (existingDuplicate) {
      // Auto-increment the existing duplicate item using pushContributor
      const updatedItem = pushContributor(
        existingDuplicate,
        {
          deviceId: device.id,
          deviceName: device.name,
          color: device.color,
        },
        quantity || 1
      );

      // Preserve any custom unit or note if provided and existing was empty
      if (!updatedItem.unit && unit) updatedItem.unit = unit;
      if (!updatedItem.note && note) updatedItem.note = note.trim();

      setItems((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
      await idbSaveItem(updatedItem);

      if (destinationListId !== activeListId) {
        setActiveListId(destinationListId);
      }

      syncClient.broadcastItemUpsert(updatedItem);

      // Record to device item history so it appears in auto-complete
      const clean = normalizeCleanName(name);
      if (clean) {
        const histItem: DeviceItemHistory = {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          deviceName: device.name,
          cleanName: clean,
          category: updatedItem.category || 'Other',
          lastUnit: updatedItem.unit,
          lastCompletedAt: Date.now(),
          purchaseCount: 1,
        };
        saveDeviceHistoryItem(histItem).catch(() => {});
        setDeviceItemHistory((prev) => {
          const idx = prev.findIndex(
            (h) => h.deviceName.toLowerCase() === device.name.toLowerCase() && h.cleanName.toLowerCase() === clean.toLowerCase()
          );
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...next[idx], lastCompletedAt: Date.now(), category: updatedItem.category || next[idx].category };
            return next;
          }
          return [histItem, ...prev];
        });
      }

      // STRICT SUPPRESSION RULE: Do NOT trigger toast notifications for duplicate auto-increments
      return updatedItem;
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
      contributors: [],
      createdAt: now,
      contentUpdatedAt: now,
      updatedAt: now,
      status: 'active',
      isUnavailableRevert: false,
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

    // Record to device item history for auto-complete
    const clean = normalizeCleanName(name);
    if (clean) {
      const histItem: DeviceItemHistory = {
        id: `hist_${now}_${Math.random().toString(36).substring(2, 7)}`,
        deviceName: device.name,
        cleanName: clean,
        category: newItem.category || 'Other',
        lastUnit: newItem.unit,
        lastCompletedAt: now,
        purchaseCount: 1,
      };
      saveDeviceHistoryItem(histItem).catch(() => {});
      setDeviceItemHistory((prev) => {
        const idx = prev.findIndex(
          (h) => h.deviceName.toLowerCase() === device.name.toLowerCase() && h.cleanName.toLowerCase() === clean.toLowerCase()
        );
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], lastCompletedAt: now, category: newItem.category || next[idx].category };
          return next;
        }
        return [histItem, ...prev];
      });
    }

    // Trigger glassmorphic creation toast for brand-new item
    showToast({
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'created',
      item: newItem,
      actorDevice: newItem.addedBy,
      timestamp: Date.now(),
    });

    return newItem;
  };

  const addFromHistory = async (historyItem: DeviceItemHistory): Promise<GroceryItem> => {
    return await addItem(
      historyItem.cleanName,
      1,
      historyItem.lastUnit,
      historyItem.category,
      undefined,
      activeListId
    );
  };

  const removeDeviceHistoryItem = async (id: string): Promise<void> => {
    setDeviceItemHistory((prev) => prev.filter((h) => h.id !== id));
    await deleteDeviceHistoryItem(id);
  };

  const incrementItem = async (id: string, qty: number = 1) => {
    // Suppress toast for quantity increments
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const updated = pushContributor(
      target,
      {
        deviceId: device.id,
        deviceName: device.name,
        color: device.color,
      },
      qty
    );

    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await idbSaveItem(updated);
    syncClient.broadcastItemUpsert(updated);
  };

  const decrementItem = async (id: string, qty: number = 1) => {
    // Suppress toast for quantity decrements
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const { updatedItem, shouldDelete } = popContributor(target, qty);

    if (shouldDelete) {
      await deleteItem(id);
      return;
    }

    if (updatedItem) {
      setItems((prev) => prev.map((i) => (i.id === id ? updatedItem : i)));
      await idbSaveItem(updatedItem);
      syncClient.broadcastItemUpsert(updatedItem);
    }
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
      // Remove Unavailable badge automatically when marked completed on a future trip
      isUnavailableRevert: willBeCompleted ? false : target.isUnavailableRevert,
      updatedAt: now,
    };

    // Confetti celebration when checking off the last remaining item on a list!
    if (willBeCompleted) {
      const remainingUncompleted = items.filter(
        (i) => i.listId === target.listId && !i.completed && i.id !== id && i.status !== 'unavailable'
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

  const markItemUnavailable = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const now = Date.now();
    const updated: GroceryItem = {
      ...target,
      status: 'unavailable',
      unavailableBy: device.name,
      unavailableAt: now,
      updatedAt: now,
    };

    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await idbSaveItem(updated);
    syncClient.broadcastItemUpsert(updated);
  };

  const restoreUnavailableItem = async (id: string) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;

    const now = Date.now();
    const updated: GroceryItem = {
      ...target,
      status: 'active',
      unavailableBy: null,
      unavailableAt: null,
      updatedAt: now,
    };

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

  const finishShoppingTrip = async (moveRemainingToUnavailable: boolean, listId: string = activeListId) => {
    const targetListItems = items.filter((i) => i.listId === listId);
    const completedList = targetListItems.filter((i) => i.completed);
    const uncompletedList = targetListItems.filter((i) => !i.completed && i.status !== 'unavailable');
    const completedItemIds = completedList.map((i) => i.id);
    const uncheckedItemIds = uncompletedList.map((i) => i.id);
    const now = Date.now();

    // 1. Locally archive completed items to deviceItemHistory for this device
    const newHistories: DeviceItemHistory[] = [];
    for (const cItem of completedList) {
      const clean = normalizeCleanName(cItem.name);
      if (clean) {
        newHistories.push({
          id: `hist_${now}_${Math.random().toString(36).substring(2, 7)}`,
          deviceName: device.name,
          cleanName: clean,
          category: cItem.category || 'Other',
          lastUnit: cItem.unit,
          lastCompletedAt: cItem.completedAt || now,
          purchaseCount: 1,
        });
      }
    }

    if (newHistories.length > 0) {
      await saveDeviceHistoryBatch(newHistories);
      const refreshed = await getDeviceHistoryFromStorage(device.name);
      setDeviceItemHistory(refreshed);
    }

    // 2. Perform optimistic local state updates
    setItems((prev) => {
      let next = prev.filter((i) => !completedItemIds.includes(i.id));

      if (moveRemainingToUnavailable && uncheckedItemIds.length > 0) {
        next = next.map((i) => {
          if (uncheckedItemIds.includes(i.id)) {
            return {
              ...i,
              status: 'unavailable',
              unavailableBy: device.name,
              unavailableAt: now,
              updatedAt: now,
            };
          }
          return i;
        });
      }

      // Revert all unavailable items back to active list with isUnavailableRevert = true
      next = next.map((i) => {
        if (i.listId === listId && i.status === 'unavailable') {
          return {
            ...i,
            status: 'active',
            isUnavailableRevert: true,
            unavailableBy: null,
            unavailableAt: null,
            updatedAt: now,
          };
        }
        return i;
      });

      return next;
    });

    // 3. Broadcast batch to WebSocket server
    syncClient.broadcastFinishShoppingBatch({
      deviceName: device.name,
      completedItemIds,
      moveRemainingToUnavailable,
      uncheckedItemIds,
      listId,
    });
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
    locallyDeletedItemIdsRef.current.add(id);
    const itemToDelete = items.find((i) => i.id === id);
    if (itemToDelete) {
      // Set for undo toast and schedule auto-dismiss in 3s
      setLastDeletedItem(itemToDelete);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setLastDeletedItem(null);
        undoTimeoutRef.current = null;
      }, 3000);

      // Glassmorphic deletion toast
      showToast({
        id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        type: 'deleted',
        item: itemToDelete,
        timestamp: Date.now(),
      });
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
    await deleteItemFromStorage(id);
    syncClient.broadcastItemDelete(id);
  };

  const undoLastDelete = async () => {
    if (!lastDeletedItem) return;
    locallyDeletedItemIdsRef.current.delete(lastDeletedItem.id);
    const restored = { ...lastDeletedItem, updatedAt: Date.now() };
    dismissUndoToast();
    dismissToast();

    setItems((prev) => {
      const exists = prev.some((i) => i.id === restored.id);
      return exists ? prev : [restored, ...prev];
    });
    await idbSaveItem(restored);
    syncClient.broadcastItemUpsert(restored);
  };

  const clearCompleted = async (listId: string = activeListId) => {
    const toDelete = items.filter((i) => i.listId === listId && i.completed);
    for (const item of toDelete) {
      locallyDeletedItemIdsRef.current.add(item.id);
    }
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
        unavailableItems,
        autoListRules,
        deviceItemHistory,
        addItem,
        incrementItem,
        decrementItem,
        toggleItem,
        updateItem,
        markItemUnavailable,
        restoreUnavailableItem,
        deleteItem,
        clearCompleted,
        uncheckAll,
        finishShoppingTrip,
        addFromHistory,
        removeDeviceHistoryItem,
        createList,
        updateList,
        deleteList,
        addAutoListRule,
        updateAutoListRule,
        deleteAutoListRule,
        syncStatus,
        lastSyncedAt,
        triggerManualSync,
        pullServerDatabase,
        checkDatabaseDiff,
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
        isShopModeOpen,
        openShopMode: () => setIsShopModeOpen(true),
        closeShopMode: () => setIsShopModeOpen(false),
        isFinishShoppingModalOpen,
        openFinishShoppingModal,
        closeFinishShoppingModal,
        isReplenishmentDrawerOpen,
        openReplenishmentDrawer,
        closeReplenishmentDrawer,
        activeEditingItemId,
        setActiveEditingItemId,
        isQuickAddOptionsOpen,
        setIsQuickAddOptionsOpen,
        lastDeletedItem,
        undoLastDelete,
        dismissUndoToast,
        activeToast,
        dismissToast,
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

