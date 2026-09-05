import { describe, it, expect } from 'vitest';
import { pushContributor, popContributor } from '../src/utils/contributorStack';
import { GroceryItem } from '../src/types';

describe('Multi-Device Contributor Badges & Decrement Stack (LIFO)', () => {
  const authorDevice = { deviceId: 'dev_kitchen_ipad', deviceName: 'Kitchen iPad', color: '#10b981' };
  const dadPhone = { deviceId: 'dev_dad_phone', deviceName: 'Dad Phone', color: '#3b82f6' };
  const momPhone = { deviceId: 'dev_mom_phone', deviceName: "Mom's iPhone", color: '#ec4899' };

  it('preserves initial item state created by primary author', () => {
    const item: GroceryItem = {
      id: 'item_oatmilk',
      listId: 'list_supermarket',
      name: 'Oat Milk',
      quantity: 1,
      category: 'Dairy & Eggs',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: authorDevice,
      contributors: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    expect(item.quantity).toBe(1);
    expect(item.contributors).toEqual([]);
  });

  it('stacks subsequent incrementing devices onto contributors stack', () => {
    let item: GroceryItem = {
      id: 'item_oatmilk',
      listId: 'list_supermarket',
      name: 'Oat Milk',
      quantity: 1,
      category: 'Dairy & Eggs',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: authorDevice,
      contributors: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    // Dad Phone increments item by 1
    item = pushContributor(item, dadPhone, 1);
    expect(item.quantity).toBe(2);
    expect(item.contributors).toHaveLength(1);
    expect(item.contributors?.[0]).toEqual({
      deviceId: 'dev_dad_phone',
      deviceName: 'Dad Phone',
      color: '#3b82f6',
      count: 1,
    });

    // Mom's Phone increments item by 2
    item = pushContributor(item, momPhone, 2);
    expect(item.quantity).toBe(4);
    expect(item.contributors).toHaveLength(2);
    expect(item.contributors?.[1]).toEqual({
      deviceId: 'dev_mom_phone',
      deviceName: "Mom's iPhone",
      color: '#ec4899',
      count: 2,
    });
  });

  it('increments top contributor count when same device increments consecutively', () => {
    let item: GroceryItem = {
      id: 'item_oatmilk',
      listId: 'list_supermarket',
      name: 'Oat Milk',
      quantity: 1,
      category: 'Dairy & Eggs',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: authorDevice,
      contributors: [],
      createdAt: 1000,
      updatedAt: 1000,
    };

    item = pushContributor(item, dadPhone, 1);
    item = pushContributor(item, dadPhone, 1);

    expect(item.quantity).toBe(3);
    expect(item.contributors).toHaveLength(1);
    expect(item.contributors?.[0].count).toBe(2);
  });

  it('pops most recent contributor in LIFO order when decrementing', () => {
    let item: GroceryItem = {
      id: 'item_oatmilk',
      listId: 'list_supermarket',
      name: 'Oat Milk',
      quantity: 4, // 1 (author) + 1 (dad) + 2 (mom)
      category: 'Dairy & Eggs',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: authorDevice,
      contributors: [
        { deviceId: 'dev_dad_phone', deviceName: 'Dad Phone', color: '#3b82f6', count: 1 },
        { deviceId: 'dev_mom_phone', deviceName: "Mom's iPhone", color: '#ec4899', count: 2 },
      ],
      createdAt: 1000,
      updatedAt: 1000,
    };

    // First decrement: mom's count goes from 2 -> 1
    const res1 = popContributor(item, 1);
    expect(res1.shouldDelete).toBe(false);
    expect(res1.updatedItem?.quantity).toBe(3);
    expect(res1.updatedItem?.contributors).toHaveLength(2);
    expect(res1.updatedItem?.contributors?.[1].count).toBe(1);

    // Second decrement: mom's count hits 0 -> completely removed from stack
    const res2 = popContributor(res1.updatedItem!, 1);
    expect(res2.shouldDelete).toBe(false);
    expect(res2.updatedItem?.quantity).toBe(2);
    expect(res2.updatedItem?.contributors).toHaveLength(1);
    expect(res2.updatedItem?.contributors?.[0].deviceId).toBe('dev_dad_phone');

    // Third decrement: dad's count hits 0 -> completely removed, back to author baseline
    const res3 = popContributor(res2.updatedItem!, 1);
    expect(res3.shouldDelete).toBe(false);
    expect(res3.updatedItem?.quantity).toBe(1);
    expect(res3.updatedItem?.contributors).toHaveLength(0);

    // Fourth decrement: quantity hits 0 -> should trigger deletion
    const res4 = popContributor(res3.updatedItem!, 1);
    expect(res4.shouldDelete).toBe(true);
    expect(res4.updatedItem).toBeNull();
  });
});
