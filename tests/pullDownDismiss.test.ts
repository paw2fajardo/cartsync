import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Universal Pull-Down Indicators & Dismissal Verification (Option 3)', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('usePullDownDismiss hook implements full-surface downward swipe with non-passive touchmove and scrollTop <= 0', () => {
    const hookPath = path.join(rootDir, 'src/hooks/usePullDownDismiss.ts');
    expect(fs.existsSync(hookPath)).toBe(true);

    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain('usePullDownDismiss');
    expect(content).toContain('getScrollParent');
    expect(content).toContain('scrollTop <= 0');
    expect(content).toContain('touchmove');
    expect(content).toContain('passive: false');
    expect(content).toContain('e.preventDefault()');
    expect(content).toContain('headerProps');
    expect(content).toContain('containerRef');
    expect(content).toContain('containerProps');
    expect(content).toContain('rubberBandFactor');
    expect(content).toContain('velocityThreshold');
    expect(content).toContain('backdropOpacity');
    expect(content).toContain('data-disable-swipe');
  });

  it('PullDownHandle component provides enlarged touch target envelope and touch-none', () => {
    const compPath = path.join(rootDir, 'src/components/PullDownHandle.tsx');
    expect(fs.existsSync(compPath)).toBe(true);

    const content = fs.readFileSync(compPath, 'utf-8');
    expect(content).toContain('PullDownHandle');
    expect(content).toContain('role="button"');
    expect(content).toContain('aria-label');
    expect(content).toContain('touch-none');
    expect(content).toContain('cursor-grab');
    expect(content).toContain('min-h-[48px]');
    expect(content).toContain('w-14 h-1.5 rounded-full');
  });

  it('GroceryItemCard wires usePullDownDismiss, PullDownHandle, and headerProps', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain("import { usePullDownDismiss } from '../hooks/usePullDownDismiss'");
    expect(content).toContain("import { PullDownHandle } from './PullDownHandle'");
    expect(content).toContain('editModalDismiss = usePullDownDismiss');
    expect(content).toContain('categoryDismiss = usePullDownDismiss');
    expect(content).toContain('<PullDownHandle');
    expect(content).toContain('editModalDismiss.headerProps');
    expect(content).toContain('categoryDismiss.headerProps');
  });

  it('DeviceModal wires usePullDownDismiss, PullDownHandle, and headerProps', () => {
    const modalPath = path.join(rootDir, 'src/components/DeviceModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    expect(content).toContain("import { usePullDownDismiss } from '../hooks/usePullDownDismiss'");
    expect(content).toContain("import { PullDownHandle } from './PullDownHandle'");
    expect(content).toContain('pullDown = usePullDownDismiss');
    expect(content).toContain('<PullDownHandle');
    expect(content).toContain('pullDown.headerProps');
    expect(content).toContain('onPointerDown={pullDown.handlePointerDown}');
  });

  it('AdminModal wires usePullDownDismiss, PullDownHandle, and headerProps', () => {
    const modalPath = path.join(rootDir, 'src/components/AdminModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf-8');

    expect(content).toContain("import { usePullDownDismiss } from '../hooks/usePullDownDismiss'");
    expect(content).toContain("import { PullDownHandle } from './PullDownHandle'");
    expect(content).toContain('pullDown = usePullDownDismiss');
    expect(content).toContain('<PullDownHandle');
    expect(content).toContain('pullDown.headerProps');
  });

  it('SyncStatusModal, NewListModal, EditListModal, DeleteListModal, CategoryManagerModal, AutoListRulesModal all wire handle & headerProps', () => {
    const modals = [
      'SyncStatusModal.tsx',
      'NewListModal.tsx',
      'EditListModal.tsx',
      'DeleteListModal.tsx',
      'CategoryManagerModal.tsx',
      'AutoListRulesModal.tsx',
    ];

    modals.forEach((fileName) => {
      const filePath = path.join(rootDir, 'src/components', fileName);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('usePullDownDismiss');
      expect(content).toContain('PullDownHandle');
      expect(content).toContain('pullDown.handlePointerDown');
      expect(content).toContain('pullDown.headerProps');
      expect(content).toContain('items-end sm:items-center');
    });
  });
});
