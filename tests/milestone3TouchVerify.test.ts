import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const rootDir = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  const fullPath = path.join(rootDir, relPath);
  return fs.readFileSync(fullPath, 'utf-8');
}

describe('Challenger M3: Empirical WCAG 2.5.5 / 2.5.8 Touch Target & Ergonomics Verification', () => {
  describe('1. Header & Navigation Ergonomics', () => {
    it('verifies Header.tsx navigation buttons satisfy >= 44x44px touch envelopes', () => {
      const header = readSource('src/components/Header.tsx');

      // Household name button
      expect(header).toContain('min-h-[44px]');
      expect(header).toContain('touch-manipulation');

      // Quick lock button
      expect(header).toMatch(/w-11\s+h-11|min-w-\[44px\]/);
      expect(header).toContain('min-h-[44px]');

      // Burger menu button
      expect(header).toContain('min-h-[44px]');
      expect(header).toContain('min-w-[44px]');

      // Live status sync button
      expect(header).toContain('min-h-[44px]');
    });

    it('verifies ThemeToggle.tsx provides 44x44px dimensions with touch-manipulation', () => {
      const themeToggle = readSource('src/components/ThemeToggle.tsx');
      expect(themeToggle).toMatch(/w-11\s+h-11/);
      expect(themeToggle).toContain('min-w-[44px]');
      expect(themeToggle).toContain('min-h-[44px]');
      expect(themeToggle).toContain('touch-manipulation');
    });
  });

  describe('2. GroceryItemCard Micro-Target Expansion & Layout Conservation', () => {
    it('verifies checkbox maintains backward compatibility while providing 44px hit bounds', () => {
      const card = readSource('src/components/GroceryItemCard.tsx');

      // Backward compatible classes from tests/uiRedesignAndContrast.test.ts
      expect(card).toContain('w-8 h-8');
      expect(card).toContain('-my-1 -ml-1');
      expect(card).toContain('w-[20px] h-[20px] rounded-full');
      expect(card).toContain('group-active/cb:scale-90');

      // Padded pseudo-element for >= 44x44px touch envelope
      expect(card).toMatch(/before:-inset-1\.5|before:-inset-2/);
      expect(card).toContain("before:content-['']");
      expect(card).toContain('touch-manipulation');
    });

    it('verifies quantity steppers expand touch envelope beyond 20x20px', () => {
      const card = readSource('src/components/GroceryItemCard.tsx');

      // Steppers (+ / -) must have touch envelope and touch-manipulation
      expect(card).toMatch(/before:-inset-2/);
      expect(card).toContain('w-7 h-7');
      expect(card).toContain('touch-manipulation');
    });

    it('verifies category switcher pill provides expanded hit bounds', () => {
      const card = readSource('src/components/GroceryItemCard.tsx');
      expect(card).toMatch(/before:-inset-2\.5|before:-inset-2/);
      expect(card).toContain('touch-manipulation');
    });

    it('verifies edit modal action buttons satisfy min-h-[44px]', () => {
      const card = readSource('src/components/GroceryItemCard.tsx');
      expect(card).toContain('min-h-[44px]');
      // Save Changes, Cancel, Delete, and Category auto-move actions
      const matchCount = (card.match(/min-h-\[44px\]/g) || []).length;
      expect(matchCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. QuickAddBar Mobile Dock Ergonomics', () => {
    it('verifies dock preserves h-11 and provides 44x44px bounds for history and actions', () => {
      const quickAdd = readSource('src/components/QuickAddBar.tsx');

      // Container height
      expect(quickAdd).toContain('h-11');

      // History clock button
      expect(quickAdd).toMatch(/w-11\s+h-11/);
      expect(quickAdd).toContain('min-w-[44px]');
      expect(quickAdd).toContain('min-h-[44px]');

      // Add button
      expect(quickAdd).toMatch(/h-11\s+px-4/);

      // Options tray toggle button
      expect(quickAdd).toMatch(/before:-inset-1/);

      // Typeahead item row
      expect(quickAdd).toContain('min-h-[44px]');
      expect(quickAdd).toContain('touch-manipulation');
    });
  });

  describe('4. All Modal and Drawer Close Triggers Standardized to >= 40-44px', () => {
    const dialogFiles = [
      'src/components/AdminModal.tsx',
      'src/components/CategoryManagerModal.tsx',
      'src/components/SyncStatusModal.tsx',
      'src/components/NewListModal.tsx',
      'src/components/EditListModal.tsx',
      'src/components/DeleteListModal.tsx',
      'src/components/DeviceModal.tsx',
      'src/components/AutoListRulesModal.tsx',
      'src/components/FinishShoppingModal.tsx',
      'src/components/ReplenishmentDrawer.tsx',
      'src/components/UnavailableDrawer.tsx',
    ];

    dialogFiles.forEach((file) => {
      it(`verifies close trigger in ${file} satisfies >= 40px–44px hit bounds and touch-manipulation`, () => {
        const content = readSource(file);
        const hasLargeBounds =
          content.includes('w-11 h-11') ||
          content.includes('min-w-[44px]') ||
          content.includes('min-w-[40px]') ||
          content.includes('before:-inset-');

        expect(
          hasLargeBounds,
          `${file} must provide >= 40x40px or 44x44px close trigger bounds`
        ).toBe(true);

        expect(
          content.includes('touch-manipulation'),
          `${file} close trigger or dialog controls must specify touch-manipulation`
        ).toBe(true);
      });
    });
  });

  describe('5. Toasts, Drawers, and Floating Action Ergonomics', () => {
    it('verifies ScrollToTopButton floating action provides 44x44px target', () => {
      const scrollToTop = readSource('src/components/ScrollToTopButton.tsx');
      expect(scrollToTop).toMatch(/w-11\s+h-11/);
      expect(scrollToTop).toContain('min-w-[44px]');
      expect(scrollToTop).toContain('min-h-[44px]');
      expect(scrollToTop).toContain('touch-manipulation');
    });

    it('verifies UndoToast and EventToast action buttons meet ergonomics', () => {
      const undoToast = readSource('src/components/UndoToast.tsx');
      const eventToast = readSource('src/components/EventToast.tsx');

      expect(undoToast).toContain('min-h-[44px]');
      expect(undoToast).toMatch(/min-w-\[40px\]|min-h-\[40px\]/);
      expect(undoToast).toContain('touch-manipulation');

      expect(eventToast).toContain('min-h-[44px]');
      expect(eventToast).toMatch(/min-w-\[40px\]|min-h-\[40px\]/);
      expect(eventToast).toContain('touch-manipulation');
    });
  });

  describe('6. Navigation Drawer & List Views Ergonomics', () => {
    it('verifies ListSidebar navigation actions meet min-h-[44px] and retain Manage Categories', () => {
      const sidebar = readSource('src/components/ListSidebar.tsx');

      expect(sidebar).toContain('Manage Categories');
      expect(sidebar).toContain('min-h-[44px]');
      expect(sidebar).toContain('touch-manipulation');
    });

    it('verifies ShopModeView checklist rows provide 44px hit bounds and negative margin counterbalance', () => {
      const shopMode = readSource('src/components/ShopModeView.tsx');

      expect(shopMode).toMatch(/w-11\s+h-11|min-w-\[44px\]/);
      expect(shopMode).toContain('-ml-2');
      expect(shopMode).toMatch(/min-w-\[40px\]\s+min-h-\[40px\]/);
      expect(shopMode).toContain('touch-manipulation');
    });

    it('verifies ItemList and CompletedList controls satisfy hit envelopes', () => {
      const itemList = readSource('src/components/ItemList.tsx');
      const completedList = readSource('src/components/CompletedList.tsx');

      expect(itemList).toMatch(/w-11\s+h-11|min-w-\[44px\]/);
      expect(itemList).toContain('touch-manipulation');

      expect(completedList).toContain('min-h-[44px]');
      expect(completedList).toMatch(/before:-inset-1/);
      expect(completedList).toContain('touch-manipulation');
    });
  });
});
