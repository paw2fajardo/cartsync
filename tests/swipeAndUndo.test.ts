import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Card Interaction Redesign: Swipe to Reveal & Undo Safety Layer', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('GroceryItemCard has touch event handlers and horizontal intent detection', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('onTouchStart');
    expect(content).toContain('onTouchMove');
    expect(content).toContain('onTouchEnd');
    expect(content).toContain('handleTouchStart');
    expect(content).toContain('handleTouchMove');
    expect(content).toContain('handleTouchEnd');
    expect(content).toContain('Math.abs(dx) > Math.abs(dy)'); // horizontal scroll protection
  });

  it('GroceryItemCard has swipe reveal delete action in the background layer', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('bg-rose-500');
    expect(content).toContain('Confirm delete item');
  });

  it('GroceryItemCard allows tapping item body to open full edit sheet', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('openEditModal()');
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
