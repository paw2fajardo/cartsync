import { describe, it, expect } from 'vitest';
import { resolveItemConflict, resolveItemListConflict } from '../src/utils/conflictResolver';
import { GroceryItem } from '../src/types';

describe('Completion-Preserving LWW Conflict Resolution Engine', () => {
  const baseTime = 1700000000000;

  const initialItem: GroceryItem = {
    id: 'item_apple_1',
    listId: 'list_supermarket',
    name: 'Organic Honeycrisp Apples',
    quantity: 4,
    unit: 'pcs',
    category: 'Produce',
    note: 'Crisp & fresh',
    completed: false,
    completedAt: null,
    completedBy: null,
    addedBy: {
      deviceId: 'dev_user_a',
      deviceName: 'User A Phone',
      color: '#10b981',
    },
    createdAt: baseTime,
    updatedAt: baseTime,
  };

  it('preserves content update when concurrent completion toggle occurs with later timestamp', () => {
    // User A edits note and quantity at t = baseTime + 1000
    const userAEdit: GroceryItem = {
      ...initialItem,
      quantity: 8,
      note: 'Large crisp Honeycrisp apples only',
      contentUpdatedAt: baseTime + 1000,
      updatedAt: baseTime + 1000,
    };

    // User B checks item off at t = baseTime + 2000
    const userBCheckOff: GroceryItem = {
      ...initialItem,
      completed: true,
      completedAt: baseTime + 2000,
      completedBy: {
        deviceId: 'dev_user_b',
        deviceName: 'User B Phone',
      },
      updatedAt: baseTime + 2000,
    };

    // Existing is User A's edit, incoming is User B's check-off
    const merged1 = resolveItemConflict(userAEdit, userBCheckOff);
    expect(merged1.quantity).toBe(8);
    expect(merged1.note).toBe('Large crisp Honeycrisp apples only');
    expect(merged1.completed).toBe(true);
    expect(merged1.completedAt).toBe(baseTime + 2000);
    expect(merged1.completedBy?.deviceId).toBe('dev_user_b');
    expect(merged1.updatedAt).toBe(baseTime + 2000);

    // Order reversed (Existing is User B's check-off, incoming is User A's edit)
    const merged2 = resolveItemConflict(userBCheckOff, userAEdit);
    expect(merged2.quantity).toBe(8);
    expect(merged2.note).toBe('Large crisp Honeycrisp apples only');
    expect(merged2.completed).toBe(true);
    expect(merged2.completedAt).toBe(baseTime + 2000);
    expect(merged2.completedBy?.deviceId).toBe('dev_user_b');
    expect(merged2.updatedAt).toBe(baseTime + 2000);
  });

  it('preserves completion status when text edit occurs with newer updatedAt timestamp', () => {
    // User B checks item off at t = baseTime + 1000
    const userBCheckOff: GroceryItem = {
      ...initialItem,
      completed: true,
      completedAt: baseTime + 1000,
      completedBy: {
        deviceId: 'dev_user_b',
        deviceName: 'User B Phone',
      },
      updatedAt: baseTime + 1000,
    };

    // User A updates note at t = baseTime + 3000 (after item was checked off)
    const userAEdit: GroceryItem = {
      ...initialItem,
      note: 'Need green ones too',
      contentUpdatedAt: baseTime + 3000,
      updatedAt: baseTime + 3000,
    };

    const merged = resolveItemConflict(userBCheckOff, userAEdit);
    expect(merged.note).toBe('Need green ones too');
    expect(merged.completed).toBe(true);
    expect(merged.completedAt).toBe(baseTime + 1000);
    expect(merged.completedBy?.deviceId).toBe('dev_user_b');
    expect(merged.updatedAt).toBe(baseTime + 3000);
  });

  it('allows unchecking an item even if content was edited previously', () => {
    // Item was completed at t = baseTime + 1000
    const completedItem: GroceryItem = {
      ...initialItem,
      completed: true,
      completedAt: baseTime + 1000,
      completedBy: { deviceId: 'dev_user_b', deviceName: 'User B' },
      updatedAt: baseTime + 1000,
    };

    // User A unchecks item at t = baseTime + 2000
    const uncheckAction: GroceryItem = {
      ...completedItem,
      completed: false,
      completedAt: null,
      completedBy: null,
      updatedAt: baseTime + 2000,
    };

    const merged = resolveItemConflict(completedItem, uncheckAction);
    expect(merged.completed).toBe(false);
    expect(merged.completedAt).toBeNull();
    expect(merged.completedBy).toBeNull();
    expect(merged.updatedAt).toBe(baseTime + 2000);
  });

  it('reconciles lists of items preserving all non-conflicting items and resolving conflicts', () => {
    const existingList: GroceryItem[] = [
      {
        ...initialItem,
        id: 'item_1',
        quantity: 5,
        updatedAt: baseTime + 1000,
      },
      {
        ...initialItem,
        id: 'item_2',
        name: 'Whole Milk',
        completed: false,
        updatedAt: baseTime,
      },
    ];

    const incomingList: GroceryItem[] = [
      {
        ...initialItem,
        id: 'item_1',
        completed: true,
        completedAt: baseTime + 2000,
        completedBy: { deviceId: 'dev_b', deviceName: 'Device B' },
        updatedAt: baseTime + 2000,
      },
      {
        ...initialItem,
        id: 'item_3',
        name: 'Sourdough Bread',
        completed: false,
        updatedAt: baseTime,
      },
    ];

    const resolved = resolveItemListConflict(existingList, incomingList);
    expect(resolved.length).toBe(3);

    const item1 = resolved.find((i) => i.id === 'item_1');
    expect(item1?.quantity).toBe(5);
    expect(item1?.completed).toBe(true);
    expect(item1?.completedAt).toBe(baseTime + 2000);

    const item2 = resolved.find((i) => i.id === 'item_2');
    expect(item2?.name).toBe('Whole Milk');

    const item3 = resolved.find((i) => i.id === 'item_3');
    expect(item3?.name).toBe('Sourdough Bread');
  });
});
