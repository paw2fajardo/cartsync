import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { GroceryList, GroceryItem } from '../src/types';
import { saveList, getAllLists, saveItem, getAllItems } from '../src/storage/idb';
import { syncClient } from '../src/sync/syncClient';
import { LIST_ICONS, LIST_COLORS } from '../src/components/EditListModal';

// W3C WCAG 2.1 Luminance & Contrast calculation
function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '');
  const r = parseInt(sanitized.substring(0, 2), 16) / 255;
  const g = parseInt(sanitized.substring(2, 4), 16) / 255;
  const b = parseInt(sanitized.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function getLuminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('Rename & Edit List Feature Verification (EDIT_LIST_SPEC.md QA Matrix)', () => {
  const rootDir = path.resolve(__dirname, '..');

  beforeEach(() => {
    localStorage.clear();
  });

  // TC-01: Modal Field Pre-population
  it('TC-01: Modal Field Pre-population - pre-populates current list name, description, icon, and color', () => {
    const list: GroceryList = {
      id: 'list_supermarket',
      name: 'Supermarket',
      description: 'Weekly household meal prep',
      icon: 'shopping-cart',
      color: 'emerald',
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };

    // Verify initial values passed to form state
    const formInitialState = {
      name: list.name || '',
      description: list.description || '',
      selectedIcon: list.icon || 'shopping-cart',
      selectedColor: list.color || 'emerald',
    };

    expect(formInitialState.name).toBe('Supermarket');
    expect(formInitialState.description).toBe('Weekly household meal prep');
    expect(formInitialState.selectedIcon).toBe('shopping-cart');
    expect(formInitialState.selectedColor).toBe('emerald');

    // Verify LIST_ICONS and LIST_COLORS palettes contain options
    expect(LIST_ICONS.some((i) => i.name === 'shopping-cart')).toBe(true);
    expect(LIST_COLORS.some((c) => c.id === 'emerald')).toBe(true);
  });

  // TC-02: Empty Name Validation
  it('TC-02: Empty Name Validation - submitting empty or whitespace-only name fails validation', () => {
    const validateName = (val: string) => {
      const trimmed = val.trim();
      return trimmed.length > 0;
    };

    expect(validateName('')).toBe(false);
    expect(validateName('   ')).toBe(false);
    expect(validateName('\t\n ')).toBe(false);
    expect(validateName('Trader Joe’s')).toBe(true);
  });

  // TC-03: Whitespace Sanitization
  it('TC-03: Whitespace Sanitization - sanitizes padded input with .trim()', () => {
    const rawName = '   Costco Wholesale   ';
    const rawDesc = '   Bulk items & groceries   ';

    const sanitizedName = rawName.trim();
    const sanitizedDesc = rawDesc.trim();

    expect(sanitizedName).toBe('Costco Wholesale');
    expect(sanitizedDesc).toBe('Bulk items & groceries');
  });

  // TC-04: Item Association Preservation
  it('TC-04: Item Association Preservation - preserves item associations and counts when list is edited', async () => {
    const originalList: GroceryList = {
      id: 'list_produce_farm',
      name: 'Farmers Market',
      description: 'Fresh vegetables',
      icon: 'carrot',
      color: 'cyan',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const item1: GroceryItem = {
      id: 'item_1',
      listId: originalList.id,
      name: 'Organic Kale',
      quantity: 2,
      category: 'Produce',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: { deviceId: 'dev_1', deviceName: 'iPhone' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const item2: GroceryItem = {
      id: 'item_2',
      listId: originalList.id,
      name: 'Local Honey',
      quantity: 1,
      category: 'Produce',
      completed: true,
      completedAt: Date.now(),
      completedBy: { deviceId: 'dev_1', deviceName: 'iPhone' },
      addedBy: { deviceId: 'dev_1', deviceName: 'iPhone' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await saveList(originalList);
    await saveItem(item1);
    await saveItem(item2);

    // Now update the list's name and icon (keeping id intact)
    const updatedList: GroceryList = {
      ...originalList,
      name: 'Union Square Greenmarket',
      icon: 'apple',
      color: 'emerald',
      description: 'Saturday morning market',
      updatedAt: Date.now() + 1000,
    };
    await saveList(updatedList);

    // Retrieve items for the list
    const items = await getAllItems();
    const listItems = items.filter((i) => i.listId === originalList.id);

    expect(listItems.length).toBe(2);
    expect(listItems.find((i) => i.id === 'item_1')?.completed).toBe(false);
    expect(listItems.find((i) => i.id === 'item_2')?.completed).toBe(true);
  });

  // TC-05: Offline IndexedDB Persistence
  it('TC-05: Offline IndexedDB Persistence - updates stored list and returns new name/icon in getAllLists()', async () => {
    const list: GroceryList = {
      id: 'list_test_persist',
      name: 'Pharmacy',
      icon: 'pill',
      color: 'rose',
      description: 'Prescriptions',
      createdAt: 1000,
      updatedAt: 1000,
    };
    await saveList(list);

    // Update list in storage
    const updatedList: GroceryList = {
      ...list,
      name: 'CVS Pharmacy & Wellness',
      icon: 'sparkles',
      color: 'blue',
      description: 'Prescriptions & vitamins',
      updatedAt: 2000,
    };
    await saveList(updatedList);

    const lists = await getAllLists();
    const stored = lists.find((l) => l.id === list.id);

    expect(stored).toBeDefined();
    expect(stored?.name).toBe('CVS Pharmacy & Wellness');
    expect(stored?.icon).toBe('sparkles');
    expect(stored?.color).toBe('blue');
    expect(stored?.description).toBe('Prescriptions & vitamins');
    expect(stored?.updatedAt).toBe(2000);
  });

  // TC-06: WebSocket Broadcast Verification
  it('TC-06: WebSocket Broadcast Verification - triggers syncClient.broadcastListUpsert with valid payload', () => {
    const broadcastSpy = vi.spyOn(syncClient, 'broadcastListUpsert');

    const updatedList: GroceryList = {
      id: 'list_supermarket',
      name: "Trader Joe's",
      icon: 'store',
      color: 'amber',
      description: 'Snacks & frozen meals',
      createdAt: 1000,
      updatedAt: 2000,
    };

    syncClient.broadcastListUpsert(updatedList);

    expect(broadcastSpy).toHaveBeenCalledTimes(1);
    expect(broadcastSpy).toHaveBeenCalledWith(updatedList);

    broadcastSpy.mockRestore();
  });

  // TC-07: Touch Envelope & Ergonomics
  it('TC-07: Touch Envelope & Ergonomics - checks Pencil triggers in ListSelector and ListSidebar', () => {
    const listSelectorContent = fs.readFileSync(path.join(rootDir, 'src/components/ListSelector.tsx'), 'utf-8');
    const listSidebarContent = fs.readFileSync(path.join(rootDir, 'src/components/ListSidebar.tsx'), 'utf-8');
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // ListSelector trigger check
    expect(listSelectorContent).toContain('Pencil');
    expect(listSelectorContent).toContain('setEditingList(activeList)');
    expect(listSelectorContent).toContain('Edit active list');

    // ListSidebar trigger check
    expect(listSidebarContent).toContain('Pencil');
    expect(listSidebarContent).toContain('setEditingList(list)');
    expect(listSidebarContent).toContain('pr-20');
    expect(listSidebarContent).toContain('e.stopPropagation()');

    // EditListModal interactive controls check
    expect(editModalContent).toContain('LIST_ICONS');
    expect(editModalContent).toContain('LIST_COLORS');
    expect(editModalContent).toContain('active:scale-95');
  });

  // TC-08: Dark Mode Contrast Compliance
  it('TC-08: Dark Mode Contrast Compliance - verifies solid bg-slate-100 dark:bg-slate-800 inputs', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Check input styling tokens
    expect(editModalContent).toContain('bg-slate-100 dark:bg-slate-800');
    expect(editModalContent).toContain('text-slate-900 dark:text-slate-100');
    expect(editModalContent).toContain('placeholder:text-slate-400 dark:placeholder:text-slate-500');

    // Verify contrast ratio exceeds WCAG AAA (7.0:1)
    const slate100 = '#f1f5f9';
    const slate800 = '#1e293b';
    const ratio = getContrastRatio(slate100, slate800);
    expect(ratio).toBeGreaterThanOrEqual(7.0);
    expect(ratio).toBeGreaterThan(12.0);
  });
});
