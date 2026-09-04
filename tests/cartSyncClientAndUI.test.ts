import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { syncClient } from '../src/sync/syncClient';
import { CATEGORY_COLORS, parseItemInput } from '../src/utils/smartCategorizer';
import { ItemCategory, HouseholdState, GroceryItem, GroceryList, DeviceProfile } from '../src/types';

describe('CartSync Client & Mobile UI Experience Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  describe('Mobile Viewport & PWA Head Tags', () => {
    it('should include viewport-fit=cover and mobile-optimized meta tags in index.html', () => {
      const htmlPath = path.join(rootDir, 'index.html');
      const html = fs.readFileSync(htmlPath, 'utf-8');

      expect(html).toContain('name="viewport"');
      expect(html).toContain('width=device-width');
      expect(html).toContain('viewport-fit=cover');
      expect(html).toContain('name="theme-color"');
      expect(html).toContain('content="#10b981"');
      expect(html).toContain('<title>CartSync — Modern Grocery Lists</title>');
    });

    it('should configure PWA manifest with CartSync brand assets and shortcuts', () => {
      const manifestPath = path.join(rootDir, 'public/manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.name).toBe('CartSync Grocery & Household Lists');
      expect(manifest.short_name).toBe('CartSync');
      expect(manifest.theme_color).toBe('#10b981');
      expect(manifest.display).toBe('standalone');
      expect(manifest.shortcuts).toBeDefined();
      expect(manifest.shortcuts.length).toBeGreaterThan(0);
      expect(manifest.shortcuts[0].url).toBe('/?action=quickadd');
    });
  });

  describe('Category Styling & Design System', () => {
    const requiredCategories: ItemCategory[] = [
      'Produce',
      'Dairy & Eggs',
      'Bakery',
      'Meat & Seafood',
      'Pantry',
      'Frozen',
      'Snacks & Sweets',
      'Beverages',
      'Household & Cleaning',
      'Pharmacy & Health',
      'Personal Care',
      'Baby & Pet',
      'Other',
    ];

    it('should define cohesive colors, backgrounds, borders, and dots for every category', () => {
      requiredCategories.forEach((category) => {
        const style = CATEGORY_COLORS[category];
        expect(style, `Missing color definition for category: ${category}`).toBeDefined();
        expect(style.bg).toMatch(/bg-\w+-\d+/);
        expect(style.text).toMatch(/text-\w+-\d+/);
        expect(style.border).toMatch(/border-\w+-\d+/);
        expect(style.dot).toMatch(/bg-\w+-\d+/);
      });
    });
  });

  describe('Natural Language Parsing Edge Cases', () => {
    it('should parse uppercase inputs with quantities and units: "1 GALLON WHOLE MILK"', () => {
      const result = parseItemInput('1 GALLON WHOLE MILK');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('gallon');
      expect(result.name).toBe('Whole milk');
      expect(result.category).toBe('Dairy & Eggs');
    });

    it('should parse decimal quantities with metric units: "0.5 kg roma tomatoes"', () => {
      const result = parseItemInput('0.5 kg roma tomatoes');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('kg');
      expect(result.name).toBe('Roma tomatoes');
      expect(result.category).toBe('Produce');
    });

    it('should parse parenthetical notes gracefully: "greek yogurt (vanilla)"', () => {
      const result = parseItemInput('greek yogurt (vanilla)');
      expect(result.name).toBe('Greek yogurt (vanilla)');
      expect(result.category).toBe('Dairy & Eggs');
    });

    it('should parse dozen with multi-word produce: "dozen organic gala apples"', () => {
      const result = parseItemInput('dozen organic gala apples');
      expect(result.quantity).toBe(12);
      expect(result.name).toBe('Organic gala apples');
      expect(result.category).toBe('Produce');
    });
  });

  describe('SyncClient Event Dispatch & State Notifications', () => {
    it('should notify subscriber immediately with current status on subscription', () => {
      let notifiedStatus = '';
      const unsubscribe = syncClient.onStatusChange((status) => {
        notifiedStatus = status;
      });

      expect(['disconnected', 'connecting', 'connected', 'offline']).toContain(notifiedStatus);
      unsubscribe();
    });

    it('should handle incoming SYNC_STATE message and dispatch to sync listeners', () => {
      const testState: HouseholdState = {
        lists: [{ id: 'l1', name: 'L1', icon: 'cart', color: 'emerald', createdAt: 1, updatedAt: 1 }],
        items: [],
        devices: [],
        version: 2,
        lastSyncedAt: Date.now(),
      };

      let receivedEvent: any = null;
      const unsubscribe = syncClient.onSync((evt) => {
        if (evt.type === 'SYNC_STATE') {
          receivedEvent = evt;
        }
      });

      (syncClient as any).handleServerMessage({
        type: 'SYNC_STATE',
        deviceId: 'server',
        timestamp: Date.now(),
        payload: testState,
      });

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent.state?.lists[0].id).toBe('l1');
      unsubscribe();
    });

    it('should handle incoming ITEM_UPSERT message and dispatch item', () => {
      const item: GroceryItem = {
        id: 'sync_item_1',
        listId: 'l1',
        name: 'Avocado Toast',
        quantity: 2,
        category: 'Produce',
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      let receivedItem: GroceryItem | undefined;
      const unsubscribe = syncClient.onSync((evt) => {
        if (evt.type === 'ITEM_UPSERT') {
          receivedItem = evt.item;
        }
      });

      (syncClient as any).handleServerMessage({
        type: 'ITEM_UPSERT',
        deviceId: 'dev_test',
        timestamp: Date.now(),
        payload: item,
      });

      expect(receivedItem?.name).toBe('Avocado Toast');
      unsubscribe();
    });

    it('should handle incoming ITEM_DELETE message and dispatch deletedItemId', () => {
      let deletedId: string | undefined;
      const unsubscribe = syncClient.onSync((evt) => {
        if (evt.type === 'ITEM_DELETE') {
          deletedId = evt.deletedItemId;
        }
      });

      (syncClient as any).handleServerMessage({
        type: 'ITEM_DELETE',
        deviceId: 'dev_test',
        timestamp: Date.now(),
        payload: { itemId: 'del_item_456' },
      });

      expect(deletedId).toBe('del_item_456');
      unsubscribe();
    });

    it('should handle incoming LIST_UPSERT and LIST_DELETE messages', () => {
      const list: GroceryList = {
        id: 'list_test_qa',
        name: 'QA List',
        icon: 'box',
        color: 'rose',
        createdAt: 1,
        updatedAt: 1,
      };

      let receivedList: GroceryList | undefined;
      let deletedListId: string | undefined;

      const unsubscribe = syncClient.onSync((evt) => {
        if (evt.type === 'LIST_UPSERT') receivedList = evt.list;
        if (evt.type === 'LIST_DELETE') deletedListId = evt.deletedListId;
      });

      (syncClient as any).handleServerMessage({
        type: 'LIST_UPSERT',
        deviceId: 'dev_test',
        timestamp: Date.now(),
        payload: list,
      });
      expect(receivedList?.name).toBe('QA List');

      (syncClient as any).handleServerMessage({
        type: 'LIST_DELETE',
        deviceId: 'dev_test',
        timestamp: Date.now(),
        payload: { listId: 'list_test_qa' },
      });
      expect(deletedListId).toBe('list_test_qa');

      unsubscribe();
    });

    it('should handle incoming DEVICE_LIST message', () => {
      const devices: DeviceProfile[] = [
        { id: 'dev_1', name: "Mom's Phone", color: '#10b981', icon: 'smartphone', lastActive: 100 },
      ];

      let receivedDevices: DeviceProfile[] | undefined;
      const unsubscribe = syncClient.onSync((evt) => {
        if (evt.type === 'DEVICE_LIST') {
          receivedDevices = evt.devices;
        }
      });

      (syncClient as any).handleServerMessage({
        type: 'DEVICE_LIST',
        deviceId: 'server',
        timestamp: Date.now(),
        payload: devices,
      });

      expect(receivedDevices?.length).toBe(1);
      expect(receivedDevices?.[0].name).toBe("Mom's Phone");
      unsubscribe();
    });

    it('should properly unsubscribe and stop receiving events', () => {
      let callCount = 0;
      const unsubscribe = syncClient.onSync(() => {
        callCount++;
      });

      (syncClient as any).handleServerMessage({
        type: 'ITEM_DELETE',
        payload: { itemId: '1' },
      });
      expect(callCount).toBe(1);

      unsubscribe();

      (syncClient as any).handleServerMessage({
        type: 'ITEM_DELETE',
        payload: { itemId: '2' },
      });
      expect(callCount).toBe(1);
    });
  });
});
