import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Card Interaction Redesign: Swipe to Reveal & Undo Safety Layer', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('useSwipeListNavigation provides horizontal swipe detection and list switching in both directions', () => {
    const hookPath = path.join(rootDir, 'src/hooks/useSwipeListNavigation.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');
    const listPath = path.join(rootDir, 'src/components/ItemList.tsx');
    const listContent = fs.readFileSync(listPath, 'utf-8');

    expect(hookContent).toContain('addEventListener(\'touchstart\'');
    expect(hookContent).toContain('addEventListener(\'touchmove\'');
    expect(hookContent).toContain('addEventListener(\'touchend\'');
    expect(hookContent).toContain('addEventListener(\'touchcancel\'');
    expect(hookContent).toContain('Math.abs(dx) > Math.abs(dy)'); // horizontal swipe intent detection
    expect(hookContent).toContain('(currentIndex + 1) % currentLists.length'); // next list
    expect(hookContent).toContain('(currentIndex - 1 + currentLists.length) % currentLists.length'); // prev list
    expect(listContent).toContain('useSwipeListNavigation');
  });

  it('GroceryItemCard provides item deletion via edit modal and delete button', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('deleteItem(item.id)');
    expect(content).toContain('openEditModal');
  });

  it('GroceryItemCard allows tapping item body to open full edit sheet', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('openEditModal');
    expect(content).toContain('setActiveEditingItemId(item.id)');
  });

  it('GroceryItemCard keeps quantity stepper isolated from accidental clicks', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('Decrease quantity');
    expect(content).toContain('Increase quantity');
    expect(content).toContain('e.stopPropagation()');
  });

  it('UndoToast renders above bottom quick add bar with polite accessibility role', () => {
    const toastPath = path.join(rootDir, 'src/components/UndoToast.tsx');
    const content = fs.readFileSync(toastPath, 'utf-8');

    expect(content).toContain('role="status"');
    expect(content).toContain('aria-live="polite"');
    expect(content).toContain('undoLastDelete');
    expect(content).toContain('dismissUndoToast');
  });

  it('GroceryContext supports undoLastDelete and lastDeletedItem tracking', () => {
    const contextPath = path.join(rootDir, 'src/context/GroceryContext.tsx');
    const content = fs.readFileSync(contextPath, 'utf-8');

    expect(content).toContain('lastDeletedItem');
    expect(content).toContain('undoLastDelete');
    expect(content).toContain('dismissUndoToast');
  });
});
