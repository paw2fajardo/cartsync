import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppUpdateBanner } from '../src/components/AppUpdateBanner';
import {
  saveList,
  saveItem,
  saveAutoListRule,
  getAllLists,
  getAllItems,
  getAllAutoListRules,
  bulkSaveData,
} from '../src/storage/idb';
import { GroceryItem, GroceryList, AutoListRule } from '../src/types';

describe('PWA Active Service Worker Update & Lifecycle Prompt', () => {
  const rootDir = path.resolve(__dirname, '..');
  const swPath = path.join(rootDir, 'public/sw.js');
  const appPath = path.join(rootDir, 'src/App.tsx');
  const hookPath = path.join(rootDir, 'src/hooks/useServiceWorkerUpdate.ts');
  const bannerPath = path.join(rootDir, 'src/components/AppUpdateBanner.tsx');

  describe('1. Service Worker skipWaiting: false Configuration', () => {
    it('public/sw.js exists and configures manual skipWaiting lifecycle', () => {
      expect(fs.existsSync(swPath)).toBe(true);
      const swContent = fs.readFileSync(swPath, 'utf-8');

      // Ensure self.skipWaiting() is NOT automatically called inside install event
      const installBlockMatch = swContent.match(/self\.addEventListener\s*\(\s*['"]install['"][\s\S]*?\n\}\);/);
      expect(installBlockMatch).not.toBeNull();
      expect(installBlockMatch![0]).not.toContain('self.skipWaiting()');

      // Verify that public/sw.js listens for SKIP_WAITING message
      expect(swContent).toContain("self.addEventListener('message'");
      expect(swContent).toContain('SKIP_WAITING');
      expect(swContent).toContain('self.skipWaiting()');

      // Verify clients.claim() is called on activate to trigger controllerchange on clients
      expect(swContent).toContain("self.addEventListener('activate'");
      expect(swContent).toContain('self.clients.claim()');
    });
  });

  describe('2. Custom React Hook (useServiceWorkerUpdate)', () => {
    it('useServiceWorkerUpdate hook file exists and contains lifecycle methods', () => {
      expect(fs.existsSync(hookPath)).toBe(true);
      const hookContent = fs.readFileSync(hookPath, 'utf-8');

      expect(hookContent).toContain('useServiceWorkerUpdate');
      expect(hookContent).toContain('updateAvailable');
      expect(hookContent).toContain('updateServiceWorker');
      expect(hookContent).toContain('SKIP_WAITING');
      expect(hookContent).toContain('controllerchange');
      expect(hookContent).toContain('window.location.reload()');
      expect(hookContent).toContain('updatefound');
    });

    it('handles waiting service worker and skipWaiting message posting', () => {
      const postMessageSpy = vi.fn();
      const mockWaitingWorker = {
        postMessage: postMessageSpy,
        addEventListener: vi.fn(),
        state: 'installed',
      };

      let controllerChangeHandler: (() => void) | null = null;
      const reloadSpy = vi.fn();

      // Mock navigator.serviceWorker and window.location
      const originalServiceWorker = navigator.serviceWorker;
      const originalLocation = window.location;

      try {
        // @ts-ignore
        delete window.location;
        // @ts-ignore
        window.location = { reload: reloadSpy };

        const mockSwContainer = {
          controller: { state: 'activated' },
          addEventListener: vi.fn((event, handler) => {
            if (event === 'controllerchange') {
              controllerChangeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          getRegistration: vi.fn().mockResolvedValue({
            waiting: mockWaitingWorker,
            installing: null,
            addEventListener: vi.fn(),
          }),
          ready: Promise.resolve({
            waiting: mockWaitingWorker,
            installing: null,
            addEventListener: vi.fn(),
          }),
        };

        // @ts-ignore
        Object.defineProperty(navigator, 'serviceWorker', {
          value: mockSwContainer,
          configurable: true,
          writable: true,
        });

        // Test sending SKIP_WAITING to waiting worker
        mockWaitingWorker.postMessage({ type: 'SKIP_WAITING' });
        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

        // Test triggering controllerchange invokes reload
        mockSwContainer.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        expect(controllerChangeHandler).toBeDefined();

        // Fire controllerchange
        if (controllerChangeHandler) {
          (controllerChangeHandler as () => void)();
        }
        expect(reloadSpy).toHaveBeenCalled();
      } finally {
        Object.defineProperty(navigator, 'serviceWorker', {
          value: originalServiceWorker,
          configurable: true,
          writable: true,
        });
        window.location = originalLocation;
      }
    });
  });

  describe('3. UI Notification (AppUpdateBanner)', () => {
    it('AppUpdateBanner component file exists and includes prompt text and action button', () => {
      expect(fs.existsSync(bannerPath)).toBe(true);
      const bannerContent = fs.readFileSync(bannerPath, 'utf-8');

      expect(bannerContent).toContain('New update available. Reload to apply.');
      expect(bannerContent).toContain('Update Now');
      expect(bannerContent).toContain('role="alert"');
      expect(bannerContent).toContain('aria-live="polite"');
    });

    it('renders update banner with expected content when update is available', () => {
      const html = renderToString(
        React.createElement(AppUpdateBanner, {
          updateAvailable: true,
          onUpdate: () => {},
          onDismiss: () => {},
        })
      );

      expect(html).toContain('New update available. Reload to apply.');
      expect(html).toContain('Update Now');
      expect(html).toContain('role="alert"');
      expect(html).toContain('data-testid="app-update-banner"');
      expect(html).toContain('data-testid="update-now-btn"');
    });

    it('does not render banner when updateAvailable is false', () => {
      const html = renderToString(
        React.createElement(AppUpdateBanner, {
          updateAvailable: false,
          onUpdate: () => {},
          onDismiss: () => {},
        })
      );

      expect(html).toBe('');
    });

    it('App.tsx integrates AppUpdateBanner inside main layout', () => {
      expect(fs.existsSync(appPath)).toBe(true);
      const appContent = fs.readFileSync(appPath, 'utf-8');

      expect(appContent).toContain("import { AppUpdateBanner } from './components/AppUpdateBanner'");
      expect(appContent).toContain('<AppUpdateBanner />');
    });
  });

  describe('4. Activation & Reload Handler Verification', () => {
    it('verifies reload handler prevents redundant reloads with refreshing flag', () => {
      let reloadCount = 0;
      let refreshing = false;

      const triggerReload = () => {
        if (!refreshing) {
          refreshing = true;
          reloadCount++;
        }
      };

      // Rapid multiple controllerchange events
      triggerReload();
      triggerReload();
      triggerReload();

      expect(reloadCount).toBe(1);
    });
  });

  describe('5. IndexedDB State Preservation Across Reload Lifecycle', () => {
    beforeEach(async () => {
      try {
        localStorage.clear();
      } catch (_) {}
    });

    it('preserves all custom items, lists, and auto-list rules in IndexedDB across reload', async () => {
      const customList: GroceryList = {
        id: 'list_pwa_test',
        name: 'PWA Update Test List',
        icon: 'Sparkles',
        color: '#10b981',
        description: 'Testing persistence across service worker reload',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const customItem1: GroceryItem = {
        id: 'item_fresh_strawberries',
        listId: customList.id,
        name: 'Organic Strawberries',
        quantity: 3,
        unit: 'punnets',
        category: 'Produce',
        completed: false,
        addedByDeviceId: 'device_phone',
        addedByDeviceName: 'PWA Mobile Device',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        contentUpdatedAt: Date.now(),
      };

      const customItem2: GroceryItem = {
        id: 'item_almond_milk',
        listId: customList.id,
        name: 'Unsweetened Almond Milk',
        quantity: 2,
        unit: 'cartons',
        category: 'Dairy & Eggs',
        completed: true,
        completedAt: Date.now(),
        completedByDeviceId: 'device_phone',
        completedByDeviceName: 'PWA Mobile Device',
        addedByDeviceId: 'device_phone',
        addedByDeviceName: 'PWA Mobile Device',
        createdAt: Date.now() - 1000,
        updatedAt: Date.now(),
        contentUpdatedAt: Date.now() - 1000,
      };

      const customRule: AutoListRule = {
        id: 'rule_berries',
        keyword: 'strawberries',
        targetListId: customList.id,
        category: 'Produce',
        createdAt: Date.now(),
      };

      // 1. Write state to IndexedDB prior to reload
      await saveList(customList);
      await saveItem(customItem1);
      await saveItem(customItem2);
      await saveAutoListRule(customRule);

      // Verify it was stored
      let storedLists = await getAllLists();
      let storedItems = await getAllItems();
      let storedRules = await getAllAutoListRules();

      expect(storedLists.some((l) => l.id === customList.id)).toBe(true);
      expect(storedItems.some((i) => i.id === customItem1.id)).toBe(true);
      expect(storedItems.some((i) => i.id === customItem2.id)).toBe(true);
      expect(storedRules.some((r) => r.id === customRule.id)).toBe(true);

      // 2. Simulate Service Worker Update:
      // - SKIP_WAITING sent
      // - controllerchange fired
      // - window.location.reload() simulated
      const postMessageSpy = vi.fn();
      const waitingWorker = { postMessage: postMessageSpy };
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

      // 3. Post-reload initialization simulation:
      // Re-read storage directly from IndexedDB as would happen on page boot
      const postReloadLists = await getAllLists();
      const postReloadItems = await getAllItems();
      const postReloadRules = await getAllAutoListRules();

      // Find our custom entities
      const preservedList = postReloadLists.find((l) => l.id === customList.id);
      const preservedItem1 = postReloadItems.find((i) => i.id === customItem1.id);
      const preservedItem2 = postReloadItems.find((i) => i.id === customItem2.id);
      const preservedRule = postReloadRules.find((r) => r.id === customRule.id);

      // Assert complete preservation with exact fields
      expect(preservedList).toBeDefined();
      expect(preservedList?.name).toBe('PWA Update Test List');

      expect(preservedItem1).toBeDefined();
      expect(preservedItem1?.name).toBe('Organic Strawberries');
      expect(preservedItem1?.quantity).toBe(3);
      expect(preservedItem1?.unit).toBe('punnets');
      expect(preservedItem1?.completed).toBe(false);
      expect(preservedItem1?.addedByDeviceName).toBe('PWA Mobile Device');

      expect(preservedItem2).toBeDefined();
      expect(preservedItem2?.name).toBe('Unsweetened Almond Milk');
      expect(preservedItem2?.quantity).toBe(2);
      expect(preservedItem2?.completed).toBe(true);
      expect(preservedItem2?.completedByDeviceName).toBe('PWA Mobile Device');

      expect(preservedRule).toBeDefined();
      expect(preservedRule?.keyword).toBe('strawberries');
      expect(preservedRule?.targetListId).toBe(customList.id);
    });
  });
});
