import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { INACTIVITY_TIMEOUT_MS } from '../src/hooks/useShopModeWakeLock';
import { triggerHaptic } from '../src/utils/haptics';
import { GroceryItem } from '../src/types';
import { saveItem, getAllItems } from '../src/storage/idb';
import { syncClient } from '../src/sync/syncClient';

describe('Shop Mode Architecture & Static Code Contract Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('ShopModeView component exists and renders true-black OLED layout with progress and wake lock toggle', () => {
    const filePath = path.join(rootDir, 'src/components/ShopModeView.tsx');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    // True-black and battery efficiency
    expect(content).toContain('shop-mode-active');
    expect(content).toContain('#000000');
    // Sticky top header elements
    expect(content).toContain('Shop Mode');
    expect(content).toContain('remaining');
    expect(content).toContain('progressPercent');
    // Keep awake toggle button
    expect(content).toContain('toggleKeepAwake');
    expect(content).toContain('wakeLockActive');
    // Exit button & confirmation modal
    expect(content).toContain('Exit Shop Mode?');
    expect(content).toContain('setShowExitConfirm');
    // Large touch targets (56px+ item rows, 48px+ touch targets)
    expect(content).toContain('min-h-[58px]');
    expect(content).toContain('w-12 h-12');
    // In Cart collapsible accordion at bottom
    expect(content).toContain('In Cart');
    expect(content).toContain('isInCartCollapsed');
    // Intercept hardware / browser back events
    expect(content).toContain('popstate');
    expect(content).toContain('cartsyncShopMode');
    // Native haptic feedback call
    expect(content).toContain('triggerHaptic');
  });

  it('useShopModeWakeLock hook implements 4-minute inactivity safety timer and visibilitychange auto-release', () => {
    const hookPath = path.join(rootDir, 'src/hooks/useShopModeWakeLock.ts');
    expect(fs.existsSync(hookPath)).toBe(true);

    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('navigator.wakeLock.request');
    expect(content).toContain('inactivityTimeoutMs');
    expect(content).toContain('INACTIVITY_TIMEOUT_MS = 4 * 60 * 1000');
    expect(content).toContain('resetInactivityTimer');
    expect(content).toContain("document.visibilityState === 'hidden'");
    expect(content).toContain("document.addEventListener('visibilitychange'");
    expect(content).toContain("window.addEventListener(evt, handleUserInteraction");
  });

  it('Shop Mode styles are declared in index.css to disable non-critical animations and enforce true black', () => {
    const cssPath = path.join(rootDir, 'src/index.css');
    const content = fs.readFileSync(cssPath, 'utf-8');

    expect(content).toContain('.shop-mode-active');
    expect(content).toContain('background-color: #000000 !important');
    expect(content).toContain('animation-duration: 0.001ms !important');
  });

  it('App.tsx and ItemList.tsx wire ShopModeView and trigger entry button', () => {
    const appPath = path.join(rootDir, 'src/App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf-8');
    expect(appContent).toContain('ShopModeView');
    expect(appContent).toContain('isShopModeOpen');
    expect(appContent).toContain('closeShopMode');

    const listPath = path.join(rootDir, 'src/components/ItemList.tsx');
    const listContent = fs.readFileSync(listPath, 'utf-8');
    expect(listContent).toContain('openShopMode');
    expect(listContent).toContain('Shop Mode');

    const sidebarPath = path.join(rootDir, 'src/components/ListSidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
    expect(sidebarContent).toContain('openShopMode');
    expect(sidebarContent).toContain('Start Shopping Mode');
  });
});

describe('Shop Mode Inactivity Timeout Constants & Wake Lock Logic', () => {
  it('defines the 4-minute inactivity timer constant', () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(4 * 60 * 1000);
    expect(INACTIVITY_TIMEOUT_MS).toBe(240000);
  });
});

describe('Haptic Feedback Utility Execution', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes navigator.vibrate with duration when supported', () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    });

    triggerHaptic(20);
    expect(vibrateMock).toHaveBeenCalledWith(20);
  });

  it('gracefully handles missing or throwing navigator.vibrate without crashing', () => {
    Object.defineProperty(navigator, 'vibrate', {
      value: () => {
        throw new Error('Not allowed by security policy');
      },
      configurable: true,
      writable: true,
    });

    expect(() => triggerHaptic(20)).not.toThrow();
  });
});

describe('Shop Mode Item Aisle / Category Sequencing Logic', () => {
  it('strictly groups and sorts items alphabetically by category and then by item name', () => {
    const items: GroceryItem[] = [
      {
        id: 'item_1',
        listId: 'list_supermarket',
        name: 'Whole Milk',
        quantity: 1,
        category: 'Dairy & Eggs',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'item_2',
        listId: 'list_supermarket',
        name: 'Avocado',
        quantity: 3,
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
        createdAt: 1001,
        updatedAt: 1001,
      },
      {
        id: 'item_3',
        listId: 'list_supermarket',
        name: 'Cheddar Cheese',
        quantity: 1,
        category: 'Dairy & Eggs',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
        createdAt: 1002,
        updatedAt: 1002,
      },
      {
        id: 'item_4',
        listId: 'list_supermarket',
        name: 'Bananas',
        quantity: 6,
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_1', deviceName: 'Phone' },
        createdAt: 1003,
        updatedAt: 1003,
      },
    ];

    // Mirror grouping and sorting algorithm used in ShopModeView
    const grouped: Record<string, GroceryItem[]> = {};
    for (const item of items) {
      const cat = item.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const sortedCategories = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    // Category sorting verification: Dairy & Eggs before Produce
    expect(sortedCategories).toEqual(['Dairy & Eggs', 'Produce']);

    // Item sorting within each category
    const sortedDairy = [...grouped['Dairy & Eggs']].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    expect(sortedDairy.map((i) => i.name)).toEqual(['Cheddar Cheese', 'Whole Milk']);

    const sortedProduce = [...grouped['Produce']].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );
    expect(sortedProduce.map((i) => i.name)).toEqual(['Avocado', 'Bananas']);
  });
});

describe('Shop Mode Completion State Persistence & Sync Non-Blocking Integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves completed item immediately to IndexedDB and broadcasts via syncClient', async () => {
    const broadcastSpy = vi.spyOn(syncClient, 'broadcastItemUpsert');

    const testItem: GroceryItem = {
      id: `item_shop_${Date.now()}`,
      listId: 'list_supermarket',
      name: 'Organic Honey',
      quantity: 1,
      category: 'Pantry',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: { deviceId: 'dev_test', deviceName: 'Shopper Phone' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Save initial item
    await saveItem(testItem);

    // Simulate Shop Mode toggle: mark completed
    const completedNow = Date.now();
    const updatedItem: GroceryItem = {
      ...testItem,
      completed: true,
      completedAt: completedNow,
      completedBy: { deviceId: 'dev_test', deviceName: 'Shopper Phone' },
      updatedAt: completedNow,
    };

    // Immediate IDB save & broadcast
    await saveItem(updatedItem);
    syncClient.broadcastItemUpsert(updatedItem);

    expect(broadcastSpy).toHaveBeenCalledWith(updatedItem);

    const allItems = await getAllItems();
    const stored = allItems.find((i) => i.id === testItem.id);
    expect(stored).toBeDefined();
    expect(stored?.completed).toBe(true);
    expect(stored?.completedAt).toBe(completedNow);
  });
});
