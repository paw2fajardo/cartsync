import { describe, it, expect } from 'vitest';
import { computeDatabaseDiff } from '../src/utils/databaseDiff';
import { GroceryItem, GroceryList, HouseholdState } from '../src/types';

describe('Deterministic Database Diff Engine', () => {
  const sampleList: GroceryList = {
    id: 'list_1',
    name: 'Costco',
    icon: 'shopping-cart',
    color: 'emerald',
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sampleItem1: GroceryItem = {
    id: 'item_1',
    listId: 'list_1',
    name: 'Organic Milk',
    quantity: 2,
    unit: 'gal',
    category: 'Dairy & Eggs',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
    createdAt: 1000,
    updatedAt: 1000,
  };

  const sampleItem2: GroceryItem = {
    id: 'item_2',
    listId: 'list_1',
    name: 'Eggs',
    quantity: 1,
    unit: 'dozen',
    category: 'Dairy & Eggs',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
    createdAt: 1000,
    updatedAt: 1000,
  };

  it('reports isIdentical: true when local and server states match', () => {
    const local = {
      lists: [sampleList],
      items: [sampleItem1, sampleItem2],
      autoListRules: [],
    };
    const server: HouseholdState = {
      version: 1,
      lists: [sampleList],
      items: [sampleItem1, sampleItem2],
      devices: [],
      autoListRules: [],
      lastSyncedAt: 1000,
    };

    const diff = computeDatabaseDiff(local, server, []);
    expect(diff.isIdentical).toBe(true);
    expect(diff.summary.identicalItemsCount).toBe(2);
    expect(diff.summary.localOnlyItemsCount).toBe(0);
    expect(diff.summary.serverOnlyItemsCount).toBe(0);
    expect(diff.summary.modifiedItemsCount).toBe(0);
    expect(diff.summary.staleLocalCount).toBe(0);
  });

  it('detects server-only additions and local-only stale items', () => {
    const staleLocalItem: GroceryItem = {
      ...sampleItem2,
      id: 'item_stale',
      name: 'Old Banana',
    };

    const serverOnlyItem: GroceryItem = {
      ...sampleItem2,
      id: 'item_server_new',
      name: 'Fresh Bread',
    };

    const local = {
      lists: [sampleList],
      items: [sampleItem1, staleLocalItem],
      autoListRules: [],
    };

    const server: HouseholdState = {
      version: 2,
      lists: [sampleList],
      items: [sampleItem1, serverOnlyItem],
      devices: [],
      autoListRules: [],
      lastSyncedAt: 2000,
    };

    const diff = computeDatabaseDiff(local, server, []);
    expect(diff.isIdentical).toBe(false);
    expect(diff.summary.identicalItemsCount).toBe(1);
    expect(diff.summary.localOnlyItemsCount).toBe(1);
    expect(diff.summary.staleLocalCount).toBe(1);
    expect(diff.summary.serverOnlyItemsCount).toBe(1);
    expect(diff.items.localOnly[0].name).toBe('Old Banana');
    expect(diff.items.serverOnly[0].name).toBe('Fresh Bread');
  });

  it('distinguishes outbox pending items from stale local items', () => {
    const outboxItem: GroceryItem = {
      ...sampleItem2,
      id: 'item_outbox_offline',
      name: 'Offline Honey',
    };

    const local = {
      lists: [sampleList],
      items: [sampleItem1, outboxItem],
      autoListRules: [],
    };

    const server: HouseholdState = {
      version: 2,
      lists: [sampleList],
      items: [sampleItem1],
      devices: [],
      autoListRules: [],
      lastSyncedAt: 2000,
    };

    const outboxEntries = [
      {
        id: 'outbox_1',
        type: 'ITEM_UPSERT' as const,
        payload: outboxItem,
        createdAt: Date.now(),
      },
    ];

    const diff = computeDatabaseDiff(local, server, outboxEntries);
    expect(diff.isIdentical).toBe(false);
    expect(diff.summary.localOnlyItemsCount).toBe(1);
    expect(diff.summary.pendingOutboxCount).toBe(1);
    // Because it's in outbox, staleLocalCount should be 0!
    expect(diff.summary.staleLocalCount).toBe(0);
    expect(diff.items.localOnly[0].isInOutbox).toBe(true);
  });

  it('detects field-level discrepancies on shared item IDs', () => {
    const modifiedLocal: GroceryItem = {
      ...sampleItem1,
      quantity: 5,
      completed: true,
    };

    const local = {
      lists: [sampleList],
      items: [modifiedLocal],
      autoListRules: [],
    };

    const server: HouseholdState = {
      version: 2,
      lists: [sampleList],
      items: [sampleItem1], // has quantity: 2, completed: false
      devices: [],
      autoListRules: [],
      lastSyncedAt: 2000,
    };

    const diff = computeDatabaseDiff(local, server, []);
    expect(diff.isIdentical).toBe(false);
    expect(diff.summary.modifiedItemsCount).toBe(1);
    expect(diff.items.modified[0].differences).toEqual([
      { field: 'quantity', localValue: 5, serverValue: 2 },
      { field: 'completed', localValue: true, serverValue: false },
    ]);
  });
});
