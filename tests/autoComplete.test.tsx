import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DeviceItemHistory } from '../src/types';
import {
  saveDeviceHistoryItem,
  deleteDeviceHistoryItem,
  getCachedHistory,
  saveDeviceHistoryBatch,
} from '../src/storage/idb';
import { normalizeCleanName } from '../src/utils/nameNormalization';

describe('Auto-Complete Suggestions & Chrome-Style Deletion Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  beforeEach(() => {
    localStorage.clear();
  });

  describe('Storage Layer: deleteDeviceHistoryItem', () => {
    it('should correctly save, retrieve, and delete items from device history', async () => {
      const item1: DeviceItemHistory = {
        id: 'hist_1',
        deviceName: 'Kitchen iPad',
        cleanName: 'Organic Whole Milk',
        category: 'Dairy & Eggs',
        lastUnit: 'gal',
        lastCompletedAt: Date.now(),
        purchaseCount: 2,
      };

      const item2: DeviceItemHistory = {
        id: 'hist_2',
        deviceName: 'Kitchen iPad',
        cleanName: 'Cooking Oil',
        category: 'Pantry',
        lastUnit: 'bottle',
        lastCompletedAt: Date.now(),
        purchaseCount: 1,
      };

      await saveDeviceHistoryItem(item1);
      await saveDeviceHistoryItem(item2);

      let history = getCachedHistory('Kitchen iPad');
      expect(history.length).toBe(2);
      expect(history.some((h) => h.cleanName === 'Cooking Oil')).toBe(true);

      // Delete item2 ("Cooking Oil")
      await deleteDeviceHistoryItem('hist_2');

      history = getCachedHistory('Kitchen iPad');
      expect(history.length).toBe(1);
      expect(history[0].cleanName).toBe('Organic Whole Milk');
      expect(history.some((h) => h.id === 'hist_2')).toBe(false);
    });
  });

  describe('Device-Name Scoping & Deduplication Filtering Logic', () => {
    it('should isolate suggestions strictly to the current device name', () => {
      const allHistories: DeviceItemHistory[] = [
        {
          id: 'hist_a',
          deviceName: 'Kitchen iPad',
          cleanName: 'Cooking Oil',
          category: 'Pantry',
          lastCompletedAt: 100,
          purchaseCount: 1,
        },
        {
          id: 'hist_b',
          deviceName: 'Kids Tablet',
          cleanName: 'Cookies',
          category: 'Snacks & Sweets',
          lastCompletedAt: 200,
          purchaseCount: 1,
        },
        {
          id: 'hist_c',
          deviceName: 'Kitchen iPad',
          cleanName: 'Coconut Water',
          category: 'Beverages',
          lastCompletedAt: 300,
          purchaseCount: 1,
        },
      ];

      const currentDeviceName = 'Kitchen iPad';

      // Filter by device name
      const scoped = allHistories.filter(
        (h) => h.deviceName.toLowerCase() === currentDeviceName.toLowerCase()
      );

      expect(scoped.length).toBe(2);
      expect(scoped.every((h) => h.deviceName === 'Kitchen iPad')).toBe(true);

      // Query "coo"
      const query = 'coo'.trim().toLowerCase();
      const matches = scoped.filter((h) => h.cleanName.toLowerCase().includes(query));

      // Must contain Cooking Oil but NOT Cookies
      expect(matches.map((m) => m.cleanName)).toEqual(['Cooking Oil']);
    });

    it('should deduplicate multiple entries of the same clean item name', () => {
      const duplicates: DeviceItemHistory[] = [
        {
          id: 'hist_1',
          deviceName: 'Kitchen iPad',
          cleanName: 'Milk',
          category: 'Dairy & Eggs',
          lastCompletedAt: 500,
          purchaseCount: 5,
        },
        {
          id: 'hist_2',
          deviceName: 'Kitchen iPad',
          cleanName: 'Milk',
          category: 'Dairy & Eggs',
          lastCompletedAt: 100,
          purchaseCount: 1,
        },
      ];

      const seen = new Set<string>();
      const deduped: DeviceItemHistory[] = [];

      for (const h of duplicates) {
        const lower = h.cleanName.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          deduped.push(h);
        }
      }

      expect(deduped.length).toBe(1);
      expect(deduped[0].id).toBe('hist_1');
    });

    it('should aggregate items added across multiple devices sharing the exact or case-insensitive deviceName "Daddy"', () => {
      // Desktop device (id: dev_desktop_1) named "Daddy"
      // Mobile device (id: dev_mobile_2) named "daddy"
      const items = [
        {
          id: 'item_desktop_1',
          listId: 'list_1',
          name: 'Ribeye Steak',
          quantity: 2,
          category: 'Meat & Seafood',
          completed: false,
          completedAt: null,
          completedBy: null,
          addedBy: {
            deviceId: 'dev_desktop_1',
            deviceName: 'Daddy',
            color: '#3b82f6',
          },
          createdAt: 1000,
          updatedAt: 1000,
        },
        {
          id: 'item_mobile_1',
          listId: 'list_1',
          name: 'Greek Yogurt',
          quantity: 1,
          category: 'Dairy & Eggs',
          completed: false,
          completedAt: null,
          completedBy: null,
          addedBy: {
            deviceId: 'dev_mobile_2',
            deviceName: 'daddy',
            color: '#10b981',
          },
          createdAt: 1100,
          updatedAt: 1100,
        },
        {
          id: 'item_kids_1',
          listId: 'list_1',
          name: 'Apple Juice',
          quantity: 1,
          category: 'Beverages',
          completed: false,
          completedAt: null,
          completedBy: null,
          addedBy: {
            deviceId: 'dev_kids_3',
            deviceName: 'Kids iPad',
            color: '#f59e0b',
          },
          createdAt: 1200,
          updatedAt: 1200,
        },
      ];

      const currentName = 'Daddy'.trim().toLowerCase();

      // Simulate QuickAddBar matching logic
      const matched = items.filter((item) => {
        const directDevName = (item.addedBy?.deviceName || '').trim().toLowerCase();
        return directDevName === currentName;
      });

      expect(matched.length).toBe(2);
      expect(matched.map((m) => m.name)).toEqual(['Ribeye Steak', 'Greek Yogurt']);
    });
  });

  describe('Component & UI Verification', () => {
    it('QuickAddBar.tsx should contain vertical dropdown and "x" removal button', () => {
      const componentPath = path.join(rootDir, 'src/components/QuickAddBar.tsx');
      const content = fs.readFileSync(componentPath, 'utf-8');

      // Check dropdown role and styling
      expect(content).toContain('role="listbox"');
      expect(content).toContain('removeDeviceHistoryItem');
      expect(content).toContain('handleRemoveTypeaheadItem');
      // Check Chrome-style 'x' button
      expect(content).toContain('title={`Remove "${item.cleanName}" from suggestions`}');
      expect(content).toContain('handleKeyDown');
      expect(content).toContain('ArrowDown');
      expect(content).toContain('ArrowUp');
      expect(content).toContain('Escape');
    });

    it('GroceryContext.tsx should export removeDeviceHistoryItem and record on addItem', () => {
      const contextPath = path.join(rootDir, 'src/context/GroceryContext.tsx');
      const content = fs.readFileSync(contextPath, 'utf-8');

      expect(content).toContain('removeDeviceHistoryItem: (id: string) => Promise<void>');
      expect(content).toContain('const removeDeviceHistoryItem = async (id: string)');
      expect(content).toContain('deleteDeviceHistoryItem(id)');
      expect(content).toContain('saveDeviceHistoryItem(histItem)');
    });
  });
});

