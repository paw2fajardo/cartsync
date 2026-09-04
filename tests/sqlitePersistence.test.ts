// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { CartSyncDatabase } from '../server/db.js';

describe('CartSync SQLite Persistence Layer Verification', () => {
  const testDbPath = path.resolve(__dirname, '../server/test-unit-cartsync.db');
  let db: CartSyncDatabase;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
    db = new CartSyncDatabase(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
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
});
