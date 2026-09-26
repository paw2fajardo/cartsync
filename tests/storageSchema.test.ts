import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAllLists,
  saveList,
  deleteListFromStorage,
  getAllItems,
  saveItem,
  deleteItemFromStorage,
  bulkSaveData,
} from '../src/storage/idb';
import { GroceryList, GroceryItem } from '../src/types';

describe('Local-First Storage (IndexedDB & LocalStorage Fallback) Verification', () => {
  const sampleList: GroceryList = {
    id: 'test_list_1',
    name: 'Trader Joe',
    description: 'Specialty snacks & frozen meals',
    icon: 'store',
    color: 'emerald',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sampleItem: GroceryItem = {
    id: 'test_item_1',
    listId: 'test_list_1',
    name: 'Mandarin Orange Chicken',
    quantity: 2,
    unit: 'bags',
    category: 'Frozen',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: {
      deviceId: 'dev_test',
      deviceName: 'Test Phone',
      color: '#10b981',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and retrieve a list from storage', async () => {
    await saveList(sampleList);
    const lists = await getAllLists();

    const found = lists.find((l) => l.id === sampleList.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Trader Joe');
    expect(found?.color).toBe('emerald');
  });

  it('should save and retrieve grocery items from storage', async () => {
    await saveList(sampleList);
    await saveItem(sampleItem);

    const items = await getAllItems();
    const found = items.find((i) => i.id === sampleItem.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('Mandarin Orange Chicken');
    expect(found?.quantity).toBe(2);
    expect(found?.category).toBe('Frozen');
  });

  it('should update an existing item in storage', async () => {
    await saveItem(sampleItem);

    const updatedItem: GroceryItem = {
      ...sampleItem,
      completed: true,
      completedAt: Date.now(),
      completedBy: {
        deviceId: 'dev_test_2',
        deviceName: 'Kitchen iPad',
      },
    };

    await saveItem(updatedItem);
    const items = await getAllItems();
    const found = items.find((i) => i.id === sampleItem.id);

    expect(found?.completed).toBe(true);
    expect(found?.completedBy?.deviceName).toBe('Kitchen iPad');
  });

  it('should delete an individual item from storage', async () => {
    await saveItem(sampleItem);
    await deleteItemFromStorage(sampleItem.id);

    const items = await getAllItems();
    const found = items.find((i) => i.id === sampleItem.id);
    expect(found).toBeUndefined();
  });

  it('should delete a list and cascade delete its associated items', async () => {
    await saveList(sampleList);
    await saveItem(sampleItem);

    const anotherItem: GroceryItem = {
      ...sampleItem,
      id: 'test_item_2',
      listId: 'different_list',
      name: 'Unrelated item',
    };
    await saveItem(anotherItem);

    await deleteListFromStorage(sampleList.id);

    const lists = await getAllLists();
    expect(lists.some((l) => l.id === sampleList.id)).toBe(false);

    const items = await getAllItems();
    expect(items.some((i) => i.id === sampleItem.id)).toBe(false);
    expect(items.some((i) => i.id === anotherItem.id)).toBe(true);
  });

  it('should perform bulkSaveData for initial seed or sync hydration', async () => {
    const bulkLists: GroceryList[] = [
      { id: 'b1', name: 'List 1', icon: 'cart', color: 'blue', createdAt: 1, updatedAt: 1 },
      { id: 'b2', name: 'List 2', icon: 'box', color: 'green', createdAt: 2, updatedAt: 2 },
    ];
    const bulkItems: GroceryItem[] = [
      {
        id: 'bi1',
        listId: 'b1',
        name: 'Bulk Apple',
        quantity: 5,
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'd1', deviceName: 'Dev 1' },
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    await bulkSaveData(bulkLists, bulkItems);

    const lists = await getAllLists();
    const items = await getAllItems();

    expect(lists.some((l) => l.id === 'b1')).toBe(true);
    expect(lists.some((l) => l.id === 'b2')).toBe(true);
    expect(items.some((i) => i.id === 'bi1')).toBe(true);
  });

  it('should maintain localStorage backup consistency (dual-write)', async () => {
    await saveList(sampleList);
    await saveItem(sampleItem);

    const rawLists = localStorage.getItem('cartsync_lists_v1');
    const rawItems = localStorage.getItem('cartsync_items_v1');

    expect(rawLists).not.toBeNull();
    expect(rawItems).not.toBeNull();

    const parsedLists: GroceryList[] = JSON.parse(rawLists!);
    const parsedItems: GroceryItem[] = JSON.parse(rawItems!);

    expect(parsedLists.some((l) => l.id === sampleList.id)).toBe(true);
    expect(parsedItems.some((i) => i.id === sampleItem.id)).toBe(true);
  });

  it('should purge existing local data completely and replace with new dataset', async () => {
    await saveList(sampleList);
    await saveItem(sampleItem);

    const freshLists: GroceryList[] = [
      { id: 'fresh_1', name: 'Fresh Market', icon: 'cart', color: 'cyan', createdAt: 2, updatedAt: 2 },
    ];
    const freshItems: GroceryItem[] = [
      {
        id: 'fresh_item_1',
        listId: 'fresh_1',
        name: 'Fresh Dragonfruit',
        quantity: 1,
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_fresh', deviceName: 'Fresh Dev' },
        createdAt: 2,
        updatedAt: 2,
      },
    ];

    const { purgeAndReplaceLocalData } = await import('../src/storage/idb');
    await purgeAndReplaceLocalData(freshLists, freshItems);

    const lists = await getAllLists();
    const items = await getAllItems();

    expect(lists.length).toBe(1);
    expect(lists[0].id).toBe('fresh_1');
    expect(items.length).toBe(1);
    expect(items[0].id).toBe('fresh_item_1');
    expect(items.some((i) => i.id === sampleItem.id)).toBe(false);
  });

  it('should queue, retrieve, and clear actions in the persistent outbox', async () => {
    const { addToOutbox, getOutbox, removeFromOutbox, clearOutbox } = await import('../src/storage/idb');
    clearOutbox();

    const task1 = addToOutbox({
      type: 'ITEM_UPSERT',
      payload: sampleItem,
    });

    const task2 = addToOutbox({
      type: 'ITEM_DELETE',
      payload: { itemId: 'item_123' },
    });

    let queue = getOutbox();
    expect(queue.length).toBe(2);
    expect(queue[0].type).toBe('ITEM_UPSERT');
    expect(queue[1].type).toBe('ITEM_DELETE');

    removeFromOutbox(task1.id);
    queue = getOutbox();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(task2.id);

    clearOutbox();
    expect(getOutbox().length).toBe(0);
  });
});
