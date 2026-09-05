import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Modal Canvas Scroll Lock Verification', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('useBodyScrollLock hook exists and locks body overflow', () => {
    const hookPath = path.join(rootDir, 'src/hooks/useBodyScrollLock.ts');
    expect(fs.existsSync(hookPath)).toBe(true);

    const content = fs.readFileSync(hookPath, 'utf-8');
    expect(content).toContain("document.body.style.overflow = 'hidden'");
    expect(content).toContain("document.body.style.position = 'fixed'");
  });

  const modalsToCheck = [
    'CategoryManagerModal.tsx',
    'GroceryItemCard.tsx',
    'AutoListRulesModal.tsx',
    'NewListModal.tsx',
    'EditListModal.tsx',
    'DeleteListModal.tsx',
    'DeviceModal.tsx',
    'SyncStatusModal.tsx',
    'ListSidebar.tsx',
  ];

  modalsToCheck.forEach((fileName) => {
    it(`${fileName} integrates useBodyScrollLock`, () => {
      const filePath = path.join(rootDir, 'src/components', fileName);
      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('useBodyScrollLock(');
    });
  });
});
