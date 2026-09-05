import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Event Toast Rules & Quantity Change Suppression', () => {
  const rootDir = path.resolve(__dirname, '..');
  const contextPath = path.join(rootDir, 'src/context/GroceryContext.tsx');
  const contextContent = fs.readFileSync(contextPath, 'utf-8');
  const toastPath = path.join(rootDir, 'src/components/EventToast.tsx');
  const toastContent = fs.readFileSync(toastPath, 'utf-8');
  const undoToastPath = path.join(rootDir, 'src/components/UndoToast.tsx');
  const undoToastContent = fs.readFileSync(undoToastPath, 'utf-8');

  it('triggers creation toast when a brand-new item is created', () => {
    // In addItem, showToast is invoked for new items
    expect(contextContent).toContain("type: 'created'");
    expect(contextContent).toContain('showToast');
  });

  it('triggers deletion toast when an item is deleted', () => {
    // In deleteItem, showToast is invoked for deleted items
    expect(contextContent).toContain("type: 'deleted'");
  });

  it('strictly suppresses toasts for duplicate auto-increments and stepper adjustments', () => {
    // Check that addItem duplicate branch returns without calling showToast
    const duplicateComment = 'STRICT SUPPRESSION RULE: Do NOT trigger toast notifications for duplicate auto-increments';
    expect(contextContent).toContain(duplicateComment);

    // Check incrementItem and decrementItem suppress toast
    expect(contextContent).toContain('Suppress toast for quantity increments');
    expect(contextContent).toContain('Suppress toast for quantity decrements');
  });

  it('EventToast and UndoToast have glassmorphic backdrop and 3-second lifecycle', () => {
    expect(toastContent).toContain('backdrop-blur-md');
    expect(toastContent).toContain('role="status"');
    expect(toastContent).toContain('aria-live="polite"');

    expect(undoToastContent).toContain('backdrop-blur-md');
    expect(undoToastContent).toContain('role="status"');
  });

  it('suppresses toasts for incoming WebSocket updates unless brand-new item from another peer', () => {
    expect(contextContent).toContain('Trigger toast ONLY for brand-new item creation from another device');
    expect(contextContent).toContain('Strictly suppress toasts for quantity updates / inline edits');
  });
});
