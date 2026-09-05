// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { CartSyncDatabase } from '../server/db.js';

describe('CartSync SQLite Persistence Layer Verification', () => {
  const testDbPath = path.resolve(__dirname, '../server/test-unit-cartsync.db');
  let db: CartSyncDatabase;

  function cleanupDbFiles() {
    for (const ext of ['', '-wal', '-shm']) {
      const f = testDbPath + ext;
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }
  }

  beforeEach(() => {
    if (db) {
      try {
        db.close();
      } catch (_) {}
    }
    cleanupDbFiles();
    db = new CartSyncDatabase(testDbPath);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch (_) {}
    }
    cleanupDbFiles();
  });

  it('should initialize and auto-seed default lists and items if empty', () => {
    const state = db.getState();
    expect(state.lists.length).toBeGreaterThanOrEqual(4);
    expect(state.items.length).toBeGreaterThanOrEqual(3);
    expect(state.devices.length).toBeGreaterThanOrEqual(2);

    const supermarket = state.lists.find((l) => l.id === 'list_supermarket');
    expect(supermarket).toBeDefined();
    expect(supermarket?.name).toBe('Supermarket');
    expect(supermarket?.isDefault).toBe(true);
  });

  it('should insert and retrieve a new grocery item with full attribution', () => {
    const testItem = {
      id: 'sqlite_item_test_1',
      listId: 'list_supermarket',
      name: 'Organic Avocados',
      quantity: 4,
      unit: 'pcs',
      category: 'Produce',
      note: 'Ripe for guacamole',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_mom_phone',
        deviceName: "Mom's Phone",
        color: '#ec4899',
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.upsertItem(testItem);

    const state = db.getState();
    const found = state.items.find((i) => i.id === testItem.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Organic Avocados');
    expect(found?.quantity).toBe(4);
    expect(found?.unit).toBe('pcs');
    expect(found?.category).toBe('Produce');
    expect(found?.note).toBe('Ripe for guacamole');
    expect(found?.addedBy?.deviceName).toBe("Mom's Phone");
  });

  it('should update an item to completed status with completedBy attribution', () => {
    const initialItem = {
      id: 'sqlite_item_test_2',
      listId: 'list_supermarket',
      name: 'Almond Milk',
      quantity: 1,
      unit: 'carton',
      category: 'Dairy & Eggs',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: { deviceId: 'dev_dad', deviceName: 'Dad Phone' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.upsertItem(initialItem);

    const completedTimestamp = Date.now();
    const updatedItem = {
      ...initialItem,
      completed: true,
      completedAt: completedTimestamp,
      completedBy: {
        deviceId: 'dev_kitchen',
        deviceName: 'Kitchen iPad',
      },
      updatedAt: completedTimestamp,
    };

    db.upsertItem(updatedItem);

    const state = db.getState();
    const found = state.items.find((i) => i.id === initialItem.id);
    expect(found?.completed).toBe(true);
    expect(found?.completedAt).toBe(completedTimestamp);
    expect(found?.completedBy?.deviceName).toBe('Kitchen iPad');
  });

  it('should delete an individual item from SQLite', () => {
    const item = {
      id: 'sqlite_item_delete_test',
      listId: 'list_supermarket',
      name: 'Temporary Item',
      quantity: 1,
      category: 'Other',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.upsertItem(item);
    expect(db.getState().items.some((i) => i.id === item.id)).toBe(true);

    db.deleteItem(item.id);
    expect(db.getState().items.some((i) => i.id === item.id)).toBe(false);
  });

  it('should create a custom list and cascade delete items when list is deleted', () => {
    const customList = {
      id: 'list_home_depot',
      name: 'Home Depot',
      description: 'Garden and hardware supplies',
      icon: 'box',
      color: 'amber',
      isDefault: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.upsertList(customList);

    const listItem = {
      id: 'item_hardware_1',
      listId: 'list_home_depot',
      name: 'LED Lightbulbs',
      quantity: 4,
      unit: 'pack',
      category: 'Household & Cleaning',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.upsertItem(listItem);

    // Verify list and item exist
    expect(db.getState().lists.some((l) => l.id === customList.id)).toBe(true);
    expect(db.getState().items.some((i) => i.id === listItem.id)).toBe(true);

    // Delete list
    db.deleteList(customList.id);

    // Verify both list and child item are gone
    expect(db.getState().lists.some((l) => l.id === customList.id)).toBe(false);
    expect(db.getState().items.some((i) => i.id === listItem.id)).toBe(false);
  });

  it('should register and update connected devices with custom names', () => {
    const device = {
      id: 'dev_test_device_1',
      name: 'Pantry Wall Tablet',
      color: '#14b8a6',
      icon: 'tablet',
      isCustomName: true,
      lastSeenAt: Date.now(),
    };

    db.upsertDevice(device);

    const state = db.getState();
    const found = state.devices.find((d) => d.id === device.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Pantry Wall Tablet');
    expect(found?.color).toBe('#14b8a6');
    expect(found?.isCustomName).toBe(true);
  });

  it('should reset database to default household state', () => {
    // Add extra items
    db.upsertItem({
      id: 'extra_1',
      listId: 'list_supermarket',
      name: 'Extra 1',
      quantity: 1,
      category: 'Other',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const resetState = db.resetDatabase();
    expect(resetState.lists.length).toBe(4);
    expect(resetState.items.some((i) => i.id === 'extra_1')).toBe(false);
    expect(resetState.items.some((i) => i.id === 'item_1')).toBe(true);
  });

  describe('Completion-Preserving LWW Merge in SQLite', () => {
    const baseTime = 1700000000000;

    it('should preserve content edit when a concurrent completion arrives via upsert', () => {
      // User A creates item then edits content
      const initialItem = {
        id: 'cp_lww_test_1',
        listId: 'list_supermarket',
        name: 'Organic Eggs',
        quantity: 1,
        unit: 'dozen',
        category: 'Dairy & Eggs',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_a', deviceName: 'User A' },
        createdAt: baseTime,
        updatedAt: baseTime,
      };

      db.upsertItem(initialItem);

      // User A edits quantity and note at t+1000
      const contentEdit = {
        ...initialItem,
        quantity: 3,
        note: 'Free range only',
        contentUpdatedAt: baseTime + 1000,
        updatedAt: baseTime + 1000,
      };
      db.upsertItem(contentEdit);

      // User B completes the item at t+2000
      const completionToggle = {
        ...initialItem,
        completed: true,
        completedAt: baseTime + 2000,
        completedBy: { deviceId: 'dev_b', deviceName: 'User B' },
        updatedAt: baseTime + 2000,
      };
      db.upsertItem(completionToggle);

      // Verify merged state
      const item = db.getItem('cp_lww_test_1');
      expect(item).toBeDefined();
      expect(item.quantity).toBe(3);
      expect(item.note).toBe('Free range only');
      expect(item.completed).toBe(true);
      expect(item.completedAt).toBe(baseTime + 2000);
      expect(item.completedBy?.deviceId).toBe('dev_b');
    });

    it('should preserve completion when a content-only edit has a newer updatedAt', () => {
      // Item is completed first
      const completedItem = {
        id: 'cp_lww_test_2',
        listId: 'list_supermarket',
        name: 'Whole Milk',
        quantity: 1,
        unit: 'gallon',
        category: 'Dairy & Eggs',
        completed: true,
        completedAt: baseTime + 1000,
        completedBy: { deviceId: 'dev_b', deviceName: 'User B' },
        addedBy: { deviceId: 'dev_a', deviceName: 'User A' },
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      };

      db.upsertItem(completedItem);

      // User A (who never saw completion) edits content at t+3000
      const contentOnlyEdit = {
        ...completedItem,
        completed: false,
        completedAt: null,
        completedBy: null,
        note: '2% fat',
        contentUpdatedAt: baseTime + 3000,
        updatedAt: baseTime + 3000,
      };

      db.upsertItem(contentOnlyEdit);

      const item = db.getItem('cp_lww_test_2');
      expect(item).toBeDefined();
      expect(item.note).toBe('2% fat');
      expect(item.completed).toBe(true);
      expect(item.completedAt).toBe(baseTime + 1000);
      expect(item.completedBy?.deviceId).toBe('dev_b');
    });

    it('should allow explicit uncheck to override completion', () => {
      const completedItem = {
        id: 'cp_lww_test_3',
        listId: 'list_supermarket',
        name: 'Butter',
        quantity: 1,
        category: 'Dairy & Eggs',
        completed: true,
        completedAt: baseTime + 1000,
        completedBy: { deviceId: 'dev_b', deviceName: 'User B' },
        addedBy: { deviceId: 'dev_a', deviceName: 'User A' },
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      };

      db.upsertItem(completedItem);

      // Explicit uncheck at t+2000 (no contentUpdatedAt set — it's a toggle, not a content edit)
      const uncheckAction = {
        ...completedItem,
        completed: false,
        completedAt: null,
        completedBy: null,
        updatedAt: baseTime + 2000,
      };

      db.upsertItem(uncheckAction);

      const item = db.getItem('cp_lww_test_3');
      expect(item).toBeDefined();
      expect(item.completed).toBe(false);
      expect(item.completedAt).toBeNull();
    });

    it('should store and retrieve contentUpdatedAt for round-trip consistency', () => {
      const item = {
        id: 'cp_lww_test_4',
        listId: 'list_supermarket',
        name: 'Bananas',
        quantity: 6,
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_a', deviceName: 'User A' },
        createdAt: baseTime,
        contentUpdatedAt: baseTime + 500,
        updatedAt: baseTime + 500,
      };

      db.upsertItem(item);

      const retrieved = db.getItem('cp_lww_test_4');
      expect(retrieved).toBeDefined();
      expect(retrieved.contentUpdatedAt).toBe(baseTime + 500);

      // Also verify it's in getState
      const state = db.getState();
      const fromState = state.items.find((i) => i.id === 'cp_lww_test_4');
      expect(fromState?.contentUpdatedAt).toBe(baseTime + 500);
    });

    it('should store and retrieve contributors stack for round-trip consistency', () => {
      const itemWithContributors = {
        id: 'cp_lww_test_contributors',
        listId: 'list_supermarket',
        name: 'Whole Milk',
        quantity: 3,
        category: 'Dairy & Eggs',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_a', deviceName: 'Kitchen iPad', color: '#10b981' },
        contributors: [
          { deviceId: 'dev_b', deviceName: 'Dad Phone', color: '#3b82f6', count: 2 },
        ],
        createdAt: baseTime,
        updatedAt: baseTime + 1000,
      };

      db.upsertItem(itemWithContributors);

      const retrieved = db.getItem('cp_lww_test_contributors');
      expect(retrieved).toBeDefined();
      expect(retrieved.contributors).toHaveLength(1);
      expect(retrieved.contributors[0].deviceId).toBe('dev_b');
      expect(retrieved.contributors[0].count).toBe(2);

      const state = db.getState();
      const fromState = state.items.find((i) => i.id === 'cp_lww_test_contributors');
      expect(fromState?.contributors).toHaveLength(1);
      expect(fromState?.contributors[0].deviceId).toBe('dev_b');
    });
  });
});
