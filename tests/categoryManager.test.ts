import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Category Manager Interactive Management Features', () => {
  const rootDir = path.resolve(__dirname, '..');
  const modalPath = path.join(rootDir, 'src/components/CategoryManagerModal.tsx');

  it('CategoryManagerModal file exists and contains interactive management features', () => {
    expect(fs.existsSync(modalPath)).toBe(true);
    const content = fs.readFileSync(modalPath, 'utf-8');

    // 1. Add Keyword Capability
    expect(content).toContain('handleAddKeyword');
    expect(content).toContain('Add Keyword to');
    expect(content).toContain('newKeywordInput');

    // 2. Delete Keyword Capability
    expect(content).toContain('handleDeleteKeyword');
    expect(content).toContain('Remove "');

    // 3. Edit Category Description
    expect(content).toContain('isEditingDescription');
    expect(content).toContain('handleSaveDescription');
    expect(content).toContain('Edit category description');

    // 4. In-place Auto-Routing Rules Management (Pencil Edit & Trash Delete)
    expect(content).toContain('handleSaveEditRule');
    expect(content).toContain('deleteAutoListRule');
    expect(content).toContain('editingRuleId');
  });
});
