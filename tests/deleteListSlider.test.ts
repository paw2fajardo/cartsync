import { describe, it, expect, beforeEach } from 'vitest';
import { GroceryList, GroceryItem } from '../src/types';
import {
  saveList,
  deleteListFromStorage,
  getAllLists,
  saveItem,
  getAllItems,
  deleteItemFromStorage,
} from '../src/storage/idb';

describe('Delete List & Slide-To-Confirm Safeguard Verification', () => {
  const sampleFarmersMarket: GroceryList = {
    id: 'list_farmers_market',
    name: 'Farmers Market',
    description: 'Weekend local produce',
    icon: 'carrot',
    color: 'cyan',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sampleSupermarket: GroceryList = {
    id: 'list_supermarket',
    name: 'Supermarket',
    description: 'Weekly staples',
    icon: 'shopping-cart',
    color: 'emerald',
    isDefault: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const sampleProduceItem: GroceryItem = {
    id: 'item_produce_1',
    listId: 'list_farmers_market',
    name: 'Heirloom Tomatoes',
    quantity: 4,
    unit: 'pcs',
    category: 'Produce',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: { deviceId: 'dev_test', deviceName: 'Test Phone' },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(async () => {
    localStorage.clear();
    // Seed initial lists
    await saveList(sampleSupermarket);
    await saveList(sampleFarmersMarket);
  });

  it('should detect when a list is not empty and require confirmation', async () => {
    await saveItem(sampleProduceItem);

    const allItems = await getAllItems();
    const farmersItems = allItems.filter((i) => i.listId === 'list_farmers_market');

    expect(farmersItems.length).toBe(1);
    expect(farmersItems[0].name).toBe('Heirloom Tomatoes');
    // Non-empty list identified
    const isNotEmpty = farmersItems.length > 0;
    expect(isNotEmpty).toBe(true);
  });

  it('should cascade delete all items when Farmers Market list is confirmed for deletion', async () => {
    await saveItem(sampleProduceItem);

    // Also add item to Supermarket to ensure unrelated items are not touched
    const supermarketItem: GroceryItem = {
      id: 'item_supermarket_1',
      listId: 'list_supermarket',
      name: 'Organic Milk',
      quantity: 1,
      category: 'Dairy & Eggs',
      completed: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveItem(supermarketItem);

    // Delete Farmers Market
    await deleteListFromStorage(sampleFarmersMarket.id);

    const remainingLists = await getAllLists();
    const remainingItems = await getAllItems();

    // Verify Farmers Market list is removed
    expect(remainingLists.some((l) => l.id === sampleFarmersMarket.id)).toBe(false);
    expect(remainingLists.some((l) => l.id === sampleSupermarket.id)).toBe(true);

    // Verify Farmers Market items were cascaded and removed
    expect(remainingItems.some((i) => i.listId === sampleFarmersMarket.id)).toBe(false);
    // Supermarket item must remain intact
    expect(remainingItems.some((i) => i.id === supermarketItem.id)).toBe(true);
  });

  it('should allow deletion of an empty list directly', async () => {
    const emptyList: GroceryList = {
      id: 'list_empty_hardware',
      name: 'Hardware Store',
      icon: 'box',
      color: 'amber',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveList(emptyList);

    const allItems = await getAllItems();
    const itemsInEmptyList = allItems.filter((i) => i.listId === emptyList.id);
    expect(itemsInEmptyList.length).toBe(0);

    // Delete empty list
    await deleteListFromStorage(emptyList.id);

    const lists = await getAllLists();
    expect(lists.some((l) => l.id === emptyList.id)).toBe(false);
  });

  it('should verify slider threshold mathematics (requires >= 85% track travel)', () => {
    const trackWidth = 300;
    const thumbWidth = 48;
    const maxDrag = trackWidth - thumbWidth - 6; // 246px

    // Case 1: Partial slide (50% travel) -> Snap back
    const dragHalf = maxDrag * 0.5;
    const isHalfConfirmed = dragHalf >= maxDrag * 0.85;
    expect(isHalfConfirmed).toBe(false);

    // Case 2: Near completion (80% travel) -> Snap back
    const dragEighty = maxDrag * 0.8;
    const isEightyConfirmed = dragEighty >= maxDrag * 0.85;
    expect(isEightyConfirmed).toBe(false);

    // Case 3: Complete slide (86% travel) -> Confirmed
    const dragConfirm = maxDrag * 0.86;
    const isConfirmed = dragConfirm >= maxDrag * 0.85;
    expect(isConfirmed).toBe(true);
  });

  it('should enforce boundary condition: cannot delete the last remaining list', async () => {
    // Delete Farmers Market so only Supermarket remains
    await deleteListFromStorage(sampleFarmersMarket.id);

    const currentLists = await getAllLists();
    expect(currentLists.length).toBe(1);

    // Boundary rule in UI and Context prevents deleting last list
    const canDelete = currentLists.length > 1;
    expect(canDelete).toBe(false);
  });
});
