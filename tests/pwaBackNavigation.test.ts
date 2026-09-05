import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Back Button & Window Navigation Tracking', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('useModalBackNavigation hook exists and manages window.history pushState and popstate listener', () => {
    const hookPath = path.join(rootDir, 'src/hooks/useModalBackNavigation.ts');
    const hookContent = fs.readFileSync(hookPath, 'utf-8');

    expect(hookContent).toContain('window.history.pushState');
    expect(hookContent).toContain('addEventListener(\'popstate\'');
    expect(hookContent).toContain('removeEventListener(\'popstate\'');
    expect(hookContent).toContain('window.history.back()');
  });

  it('ListSidebar integrates useModalBackNavigation for sidebar drawer and sub-modals', () => {
    const sidebarPath = path.join(rootDir, 'src/components/ListSidebar.tsx');
    const content = fs.readFileSync(sidebarPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isOpen, onClose, \'list-sidebar\')');
    expect(content).toContain('useModalBackNavigation(Boolean(editingList)');
    expect(content).toContain('useModalBackNavigation(Boolean(deletingList)');
  });

  it('AdminModal integrates useModalBackNavigation', () => {
    const adminPath = path.join(rootDir, 'src/components/AdminModal.tsx');
    const content = fs.readFileSync(adminPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isAdminModalOpen, closeAdminModal, \'admin-modal\')');
  });

  it('DeviceModal integrates useModalBackNavigation', () => {
    const devicePath = path.join(rootDir, 'src/components/DeviceModal.tsx');
    const content = fs.readFileSync(devicePath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isRenameOpen, closeRenameModal, \'device-modal\')');
  });

  it('CategoryManagerModal integrates useModalBackNavigation', () => {
    const catPath = path.join(rootDir, 'src/components/CategoryManagerModal.tsx');
    const content = fs.readFileSync(catPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isOpen, onClose, \'category-manager-modal\')');
  });

  it('AutoListRulesModal integrates useModalBackNavigation', () => {
    const rulesPath = path.join(rootDir, 'src/components/AutoListRulesModal.tsx');
    const content = fs.readFileSync(rulesPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isAutoListRulesModalOpen, closeAutoListRulesModal, \'auto-list-rules-modal\')');
  });

  it('SyncStatusModal integrates useModalBackNavigation', () => {
    const syncPath = path.join(rootDir, 'src/components/SyncStatusModal.tsx');
    const content = fs.readFileSync(syncPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isSyncModalOpen, closeSyncModal, \'sync-modal\')');
  });

  it('NewListModal integrates useModalBackNavigation', () => {
    const newListPath = path.join(rootDir, 'src/components/NewListModal.tsx');
    const content = fs.readFileSync(newListPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isNewListModalOpen, closeNewListModal, \'new-list-modal\')');
  });

  it('GroceryItemCard integrates useModalBackNavigation for item inline edit sheet', () => {
    const cardPath = path.join(rootDir, 'src/components/GroceryItemCard.tsx');
    const content = fs.readFileSync(cardPath, 'utf-8');

    expect(content).toContain('useModalBackNavigation');
    expect(content).toContain('useModalBackNavigation(isInlineEditing');
  });
});
