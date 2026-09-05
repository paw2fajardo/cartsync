import { GroceryItem, DeviceRef } from '../types';

/**
 * Pushes or increments a contributor on an item's contributor stack.
 *
 * Attribution Rules:
 * - If the acting device matches `item.addedBy.deviceId` and `contributors` is empty:
 *   Just increments `quantity` (the original author created and incremented).
 * - If the acting device is another device:
 *   Increments `quantity` and pushes to the LIFO contributor stack (or updates the top
 *   contributor if it's the same device).
 */
export function pushContributor(
  item: GroceryItem,
  actingDevice: DeviceRef,
  incrementQty: number = 1
): GroceryItem {
  const qtyToAdd = Math.max(1, incrementQty);
  const now = Date.now();
  const existingContributors = item.contributors ? [...item.contributors] : [];

  // If this device is the original creator and no other contributors have stacked on top yet
  if (item.addedBy.deviceId === actingDevice.deviceId && existingContributors.length === 0) {
    return {
      ...item,
      quantity: item.quantity + qtyToAdd,
      contentUpdatedAt: now,
      updatedAt: now,
    };
  }

  // Check if the top (most recent) contributor is this same device
  const lastIndex = existingContributors.length - 1;
  if (lastIndex >= 0 && existingContributors[lastIndex].deviceId === actingDevice.deviceId) {
    existingContributors[lastIndex] = {
      ...existingContributors[lastIndex],
      count: existingContributors[lastIndex].count + qtyToAdd,
      deviceName: actingDevice.deviceName || existingContributors[lastIndex].deviceName,
      color: actingDevice.color || existingContributors[lastIndex].color,
    };
  } else {
    // New contributor layer pushed onto LIFO stack
    existingContributors.push({
      deviceId: actingDevice.deviceId,
      deviceName: actingDevice.deviceName,
      color: actingDevice.color,
      count: qtyToAdd,
    });
  }

  return {
    ...item,
    quantity: item.quantity + qtyToAdd,
    contributors: existingContributors,
    contentUpdatedAt: now,
    updatedAt: now,
  };
}

/**
 * Pops or decrements from the contributor stack in LIFO (Last-In, First-Out) order.
 *
 * Rules:
 * - If total quantity drops to <= 0, `shouldDelete` is true.
 * - Pops from the most recent incrementing contributor in `contributors`.
 * - When a contributor's count reaches 0, their record is removed completely from the stack.
 * - When all contributor records are exhausted, decrements the original creator's allocation.
 * - If the original creator's allocation is exhausted but contributors remain, shifts primary
 *   ownership (`addedBy`) to the next contributor.
 */
export function popContributor(
  item: GroceryItem,
  decrementQty: number = 1
): { updatedItem: GroceryItem | null; shouldDelete: boolean } {
  const newTotalQty = item.quantity - decrementQty;
  if (newTotalQty <= 0) {
    return {
      updatedItem: null,
      shouldDelete: true,
    };
  }

  const now = Date.now();
  const contributors = item.contributors ? [...item.contributors] : [];

  let remainingToDecrement = decrementQty;

  // LIFO: start from the top/end of the contributor stack
  while (remainingToDecrement > 0 && contributors.length > 0) {
    const topIdx = contributors.length - 1;
    const top = contributors[topIdx];

    if (top.count <= remainingToDecrement) {
      remainingToDecrement -= top.count;
      contributors.pop(); // Count hit 0, remove layer completely
    } else {
      top.count -= remainingToDecrement;
      remainingToDecrement = 0;
    }
  }

  return {
    updatedItem: {
      ...item,
      quantity: newTotalQty,
      contributors,
      contentUpdatedAt: now,
      updatedAt: now,
    },
    shouldDelete: false,
  };
}
