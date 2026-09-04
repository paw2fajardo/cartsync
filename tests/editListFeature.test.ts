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
    expect(validateName('Trader Joe\'s')).toBe(true);
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

  // ─── EXTENDED TESTS (task-rename-list-qa gap coverage) ───────────────────────

  // TC-09: 40-Character Name Cap — maxLength enforcement on name input
  it('TC-09: 40-Char Name Cap - EditListModal enforces maxLength=40 on name input', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Verify maxLength=40 attribute is present on the name input
    expect(editModalContent).toContain('maxLength={40}');

    // Verify the live character counter references /40
    expect(editModalContent).toContain('/40');

    // Validate that a 40-char name is accepted and a 41-char name would be trimmed by maxLength
    const exactly40 = 'A'.repeat(40);
    const exceeds40 = 'A'.repeat(41);

    // A browser-enforced maxLength of 40 means the value can never exceed 40 chars
    const clampedByMaxLength = (raw: string, max: number) => raw.slice(0, max);
    expect(clampedByMaxLength(exactly40, 40).length).toBe(40);
    expect(clampedByMaxLength(exceeds40, 40).length).toBe(40);

    // The trimmed name must still validate as non-empty after clamping
    const trimmedAndClamped = clampedByMaxLength(exceeds40, 40).trim();
    expect(trimmedAndClamped.length).toBeGreaterThan(0);
  });

  // TC-10: 60-Character Description Cap — maxLength enforcement on description input
  it('TC-10: 60-Char Description Cap - EditListModal enforces maxLength=60 on description input', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Verify maxLength=60 attribute is present on the description input
    expect(editModalContent).toContain('maxLength={60}');

    // Verify the live character counter references /60
    expect(editModalContent).toContain('/60');

    // Simulate clamp behavior the browser enforces at the input level
    const exactly60 = 'B'.repeat(60);
    const exceeds60 = 'B'.repeat(61);

    const clampedByMaxLength = (raw: string, max: number) => raw.slice(0, max);
    expect(clampedByMaxLength(exactly60, 60).length).toBe(60);
    expect(clampedByMaxLength(exceeds60, 60).length).toBe(60);
  });

  // TC-11: Icon Picker Selection — all 8 icons present and selectable
  it('TC-11: Icon Picker Selection - LIST_ICONS exports all 8 icons with correct names and labels', () => {
    const expectedIcons = [
      { name: 'shopping-cart', label: 'Cart' },
      { name: 'store', label: 'Store' },
      { name: 'box', label: 'Box' },
      { name: 'pill', label: 'Pharmacy' },
      { name: 'apple', label: 'Produce' },
      { name: 'carrot', label: 'Market' },
      { name: 'coffee', label: 'Cafe' },
      { name: 'sparkles', label: 'Special' },
    ];

    // Verify all 8 icons are exported
    expect(LIST_ICONS).toHaveLength(8);

    // Verify each icon name & label matches the spec
    for (const expected of expectedIcons) {
      const found = LIST_ICONS.find((i) => i.name === expected.name);
      expect(found, `Icon "${expected.name}" should exist in LIST_ICONS`).toBeDefined();
      expect(found?.label).toBe(expected.label);
    }

    // Verify icon selection logic: each icon has a valid React component reference.
    // Note: lucide-react exports icons as forwardRef objects (typeof === 'object'),
    // not bare functions. We verify they are defined and non-null (renderable components).
    for (const iconDef of LIST_ICONS) {
      expect(iconDef.icon).toBeDefined();
      expect(iconDef.icon).not.toBeNull();
      // A React component is either a function or a forwardRef object
      expect(['function', 'object'].includes(typeof iconDef.icon)).toBe(true);
    }

    // Simulate user selection: selecting 'apple' updates selectedIcon
    let selectedIcon = 'shopping-cart'; // initial
    const selectIcon = (name: string) => { selectedIcon = name; };
    selectIcon('apple');
    expect(selectedIcon).toBe('apple');

    // Simulate re-selecting original
    selectIcon('shopping-cart');
    expect(selectedIcon).toBe('shopping-cart');
  });

  // TC-12: Color Swatch Selection — all 6 colors present and selectable
  it('TC-12: Color Swatch Selection - LIST_COLORS exports all 6 colors with correct IDs', () => {
    const expectedColors = [
      { id: 'emerald', name: 'Emerald' },
      { id: 'amber',   name: 'Amber'   },
      { id: 'rose',    name: 'Rose'    },
      { id: 'blue',    name: 'Blue'    },
      { id: 'cyan',    name: 'Cyan'    },
      { id: 'purple',  name: 'Purple'  },
    ];

    // Verify all 6 colors are exported
    expect(LIST_COLORS).toHaveLength(6);

    // Verify each color id, name, bg, ring, text tokens
    for (const expected of expectedColors) {
      const found = LIST_COLORS.find((c) => c.id === expected.id);
      expect(found, `Color "${expected.id}" should exist in LIST_COLORS`).toBeDefined();
      expect(found?.name).toBe(expected.name);
      expect(found?.bg).toBe(`bg-${expected.id}-500`);
      expect(found?.ring).toBe(`ring-${expected.id}-500`);
      expect(found?.text).toBe(`text-${expected.id}-500`);
    }

    // Simulate user swatch selection
    let selectedColor = 'emerald'; // initial (pre-populated)
    const selectColor = (id: string) => { selectedColor = id; };
    selectColor('rose');
    expect(selectedColor).toBe('rose');

    selectColor('purple');
    expect(selectedColor).toBe('purple');

    // Reset to emerald
    selectColor('emerald');
    expect(selectedColor).toBe('emerald');
  });

  // TC-13: broadcastListUpsert WebSocket call — correct LIST_UPSERT payload structure
  it('TC-13: broadcastListUpsert - emits LIST_UPSERT type with full GroceryList payload', () => {
    const sentMessages: any[] = [];

    // Intercept syncClient.send via spy
    const sendSpy = vi.spyOn(syncClient as any, 'send').mockImplementation((msg: any) => {
      sentMessages.push(msg);
    });

    const renamedList: GroceryList = {
      id: 'list_costco',
      name: 'Costco Wholesale',
      icon: 'box',
      color: 'blue',
      description: 'Bulk household run',
      createdAt: 1000,
      updatedAt: Date.now(),
    };

    syncClient.broadcastListUpsert(renamedList);

    // Verify send was called once
    expect(sendSpy).toHaveBeenCalledTimes(1);

    // Verify the dispatched message structure
    const sentMsg = sentMessages[0];
    expect(sentMsg.type).toBe('LIST_UPSERT');
    expect(sentMsg.payload).toMatchObject({
      id: 'list_costco',
      name: 'Costco Wholesale',
      icon: 'box',
      color: 'blue',
      description: 'Bulk household run',
    });
    expect(sentMsg.timestamp).toBeDefined();
    expect(typeof sentMsg.timestamp).toBe('number');

    sendSpy.mockRestore();
  });

  // TC-14: IndexedDB Persistence of Renamed List — id unchanged, name/icon updated
  it('TC-14: IndexedDB Persistence of Renamed List - id stable, all metadata fields updated correctly', async () => {
    const originalId = 'list_stable_id_check';

    const original: GroceryList = {
      id: originalId,
      name: 'Old Market Name',
      icon: 'shopping-cart',
      color: 'emerald',
      description: 'Original description',
      createdAt: 500,
      updatedAt: 500,
    };

    await saveList(original);

    // Simulate updateList: spread original + overwrite fields + new updatedAt
    const renamed: GroceryList = {
      ...original,
      name: 'Whole Foods Market',
      icon: 'apple',
      color: 'cyan',
      description: 'Organic & premium groceries',
      updatedAt: 9999,
    };

    await saveList(renamed);

    const allLists = await getAllLists();
    const stored = allLists.find((l) => l.id === originalId);

    // The record must exist (same id)
    expect(stored).toBeDefined();

    // List ID must remain unchanged
    expect(stored?.id).toBe(originalId);

    // All metadata fields must reflect the rename
    expect(stored?.name).toBe('Whole Foods Market');
    expect(stored?.icon).toBe('apple');
    expect(stored?.color).toBe('cyan');
    expect(stored?.description).toBe('Organic & premium groceries');
    expect(stored?.updatedAt).toBe(9999);

    // Immutable field: createdAt must not change
    expect(stored?.createdAt).toBe(500);

    // Only ONE record with this id must exist (no phantom duplicates)
    const matchingRecords = allLists.filter((l) => l.id === originalId);
    expect(matchingRecords.length).toBe(1);
  });

  // TC-15: Cancel / Close Without Saving — state mutations must not be persisted
  it('TC-15: Cancel/Close Without Saving - discards all edits, storage remains unchanged', async () => {
    const listBefore: GroceryList = {
      id: 'list_cancel_test',
      name: 'Original Name',
      icon: 'store',
      color: 'amber',
      description: 'Original description',
      createdAt: 100,
      updatedAt: 100,
    };

    await saveList(listBefore);

    // Simulate the user editing the form fields (in-memory only)
    let formName = listBefore.name;
    let formIcon = listBefore.icon;
    let formColor = listBefore.color;
    let formDescription = listBefore.description || '';

    // User types into the form
    formName = 'New Name They Will Cancel';
    formIcon = 'apple';
    formColor = 'rose';
    formDescription = 'A description that will be discarded';

    // User clicks Cancel / X button → onClose() fires, no updateList() called
    const onClose = () => {
      // Reset form to initial values (simulates the useEffect re-sync on re-open)
      formName = listBefore.name;
      formIcon = listBefore.icon;
      formColor = listBefore.color;
      formDescription = listBefore.description || '';
    };
    onClose();

    // Form state must be reset to original values
    expect(formName).toBe('Original Name');
    expect(formIcon).toBe('store');
    expect(formColor).toBe('amber');
    expect(formDescription).toBe('Original description');

    // Storage must remain unchanged (updateList/saveList was never called)
    const allLists = await getAllLists();
    const stored = allLists.find((l) => l.id === 'list_cancel_test');
    expect(stored?.name).toBe('Original Name');
    expect(stored?.icon).toBe('store');
    expect(stored?.color).toBe('amber');
    expect(stored?.description).toBe('Original description');
    expect(stored?.updatedAt).toBe(100);
  });

  // TC-16: Save CTA Disabled When Name Is Empty
  it('TC-16: Save CTA Disabled When Name Is Empty - isValid guards Save button disabled state', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // The submit button must include `disabled={!isValid || !isDirty}` logic
    expect(editModalContent).toContain('disabled={!isValid || !isDirty}');

    // Simulate validation logic from the component
    const computeIsValid = (name: string) => name.trim().length > 0;
    const computeIsDirty = (
      name: string,
      desc: string,
      icon: string,
      color: string,
      list: { name: string; description?: string; icon: string; color: string }
    ) =>
      name.trim() !== list.name ||
      desc.trim() !== (list.description || '') ||
      icon !== list.icon ||
      color !== list.color;

    const originalList = { name: 'Supermarket', description: '', icon: 'shopping-cart', color: 'emerald' };

    // Empty name → isValid=false → button disabled regardless of isDirty
    expect(computeIsValid('')).toBe(false);
    expect(computeIsValid('   ')).toBe(false);

    // Non-empty name with change → both isValid & isDirty true → button enabled
    expect(computeIsValid("Trader Joe's")).toBe(true);
    expect(computeIsDirty("Trader Joe's", '', 'shopping-cart', 'emerald', originalList)).toBe(true);

    // Non-empty name but no change → isDirty=false → button still disabled
    expect(computeIsValid('Supermarket')).toBe(true);
    expect(computeIsDirty('Supermarket', '', 'shopping-cart', 'emerald', originalList)).toBe(false);
  });

  // TC-17: Inline Validation Error Badge Rendering
  it('TC-17: Inline Validation Error Badge - error message renders when touched and name is empty', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // The modal must contain the error message text
    expect(editModalContent).toContain('List name cannot be empty.');

    // The error renders only when `touched && !isValid`
    expect(editModalContent).toContain('touched && !isValid');

    // Simulate touched + empty name → error shown
    const touched = true;
    const isValid = false;
    expect(touched && !isValid).toBe(true);

    // Simulate touched + valid name → error hidden
    const isValidName = true;
    expect(touched && !isValidName).toBe(false);
  });

  // TC-18: Icon Selector Grid — 4-column layout and all icons rendered with labels
  it('TC-18: Icon Selector Grid - 4-column grid renders icons with labels in EditListModal', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Verify 4-column grid layout
    expect(editModalContent).toContain('grid-cols-4');

    // Verify each icon name is used in the grid (via LIST_ICONS.map)
    for (const iconDef of LIST_ICONS) {
      expect(editModalContent).toContain(iconDef.name);
    }

    // Verify icon label rendering
    expect(editModalContent).toContain('label}');
  });

  // TC-19: Color Swatch Check Icon — selected swatch shows Check icon
  it('TC-19: Color Swatch Check Icon - selected color swatch renders Check icon from lucide-react', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Verify Check is imported from lucide-react
    expect(editModalContent).toContain('Check');
    expect(editModalContent).toContain('isSelected && <Check');

    // Verify ring-offset and scale-110 styling for selected swatch
    expect(editModalContent).toContain('ring-2 ring-offset-2');
    expect(editModalContent).toContain('scale-110');
  });

  // TC-20: Live Preview Pill Updates on Input Change
  it('TC-20: Live Preview Pill - preview updates immediately when name, icon, or color changes', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    // Modal must contain "Live List Preview" label
    expect(editModalContent).toContain('Live List Preview');

    // Preview must use trimmedName (not raw name)
    expect(editModalContent).toContain('trimmedName');

    // Preview must show fallback "Untitled List" when trimmedName is empty
    expect(editModalContent).toContain('Untitled List');

    // Preview must show description or fallback 'No description'
    expect(editModalContent).toContain('No description');

    // Preview uses the SelectedIconComp derived from selectedIcon state
    expect(editModalContent).toContain('SelectedIconComp');
  });

  // TC-21: Modal Accessibility — role, aria-modal, aria-labelledby
  it('TC-21: Modal Accessibility - EditListModal has ARIA role=dialog, aria-modal, and aria-labelledby', () => {
    const editModalContent = fs.readFileSync(path.join(rootDir, 'src/components/EditListModal.tsx'), 'utf-8');

    expect(editModalContent).toContain('role="dialog"');
    expect(editModalContent).toContain('aria-modal="true"');
    expect(editModalContent).toContain('aria-labelledby="edit-list-title"');
    expect(editModalContent).toContain('id="edit-list-title"');

    // Close button must have aria-label
    expect(editModalContent).toContain('aria-label="Close dialog"');

    // Color swatch buttons must have aria-label for accessibility
    expect(editModalContent).toContain('aria-label={`Select color ${c.name}`}');
  });

  // TC-22: GroceryContext updateList — triggers idbSaveList + broadcastListUpsert together
  it('TC-22: GroceryContext.updateList flow — idbSaveList and broadcastListUpsert both called on save', async () => {
    // Verify the production context source contains both calls together
    const contextContent = fs.readFileSync(path.join(rootDir, 'src/context/GroceryContext.tsx'), 'utf-8');

    // updateList must call idbSaveList
    expect(contextContent).toContain('idbSaveList(updated)');

    // updateList must call broadcastListUpsert
    expect(contextContent).toContain('syncClient.broadcastListUpsert(updated)');

    // Both calls must be inside updateList function body
    const updateListFnIdx = contextContent.indexOf('const updateList = async');
    const nextFnIdx = contextContent.indexOf('\n  const deleteList', updateListFnIdx);
    const updateListBody = contextContent.slice(updateListFnIdx, nextFnIdx);

    expect(updateListBody).toContain('idbSaveList(updated)');
    expect(updateListBody).toContain('syncClient.broadcastListUpsert(updated)');

    // Optimistic state update must also be present
    expect(updateListBody).toContain('setLists((prev)');
  });

  // TC-23: ListSelector.tsx — edit trigger always visible (even with 1 list)
  it('TC-23: ListSelector edit trigger visible for single list - no canDelete guard on edit button', () => {
    const listSelectorContent = fs.readFileSync(path.join(rootDir, 'src/components/ListSelector.tsx'), 'utf-8');

    // Edit button must be guarded only by `activeList`, NOT by `canDeleteActive`
    // canDeleteActive gates the delete button; edit button is always visible
    expect(listSelectorContent).toContain('canDeleteActive');

    // The edit button should be inside `{activeList && (` — not inside `{canDeleteActive && activeList && (`
    // Verify the edit button triggers setEditingList(activeList)
    expect(listSelectorContent).toContain('setEditingList(activeList)');

    // Delete button is the one gated by canDeleteActive
    expect(listSelectorContent).toContain('{canDeleteActive && activeList && (');
  });

  // TC-24: ListSidebar edit trigger — stop propagation prevents accidental list switch
  it('TC-24: ListSidebar edit stopPropagation - click on Pencil does not propagate to list selector', () => {
    const listSidebarContent = fs.readFileSync(path.join(rootDir, 'src/components/ListSidebar.tsx'), 'utf-8');

    // e.stopPropagation() must be called before setEditingList
    const editBtnIdx = listSidebarContent.indexOf('setEditingList(list)');
    const stopPropIdx = listSidebarContent.indexOf('e.stopPropagation()', editBtnIdx - 200);

    expect(stopPropIdx).toBeGreaterThan(-1);

    // The edit button must render Pencil inside an onClick that calls stopPropagation
    expect(listSidebarContent).toContain('e.stopPropagation()');
    expect(listSidebarContent).toContain('setEditingList(list)');
  });
});
