// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { CartSyncDatabase } from '../server/db.js';
import { normalizeCleanName } from '../src/utils/nameNormalization';

describe('Replenishment History, Name Normalization, and Finish Shopping Workflows', () => {
  const testDbPath = path.resolve(__dirname, '../server/test-replenish-unavailable.db');
  let db: CartSyncDatabase;

  function cleanupDbFiles() {
    for (const ext of ['', '-wal', '-shm']) {
      const f = testDbPath + ext;
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }
  }

  beforeEach(() => {
    if (db) {
      try {
        db.close();
      } catch (_) {}
    }
    cleanupDbFiles();
    db = new CartSyncDatabase(testDbPath);
  });

  afterEach(() => {
    if (db) {
      try {
        db.close();
      } catch (_) {}
    }
    cleanupDbFiles();
  });

  describe('Name Normalization Utility', () => {
    it('should strip markdown tags, hashtags, and bracketed content', () => {
      expect(normalizeCleanName('#Organic Whole Milk (2L)')).toBe('Organic Whole Milk');
      expect(normalizeCleanName('Organic Avocados [Ripened] #Produce')).toBe('Organic Avocados');
      expect(normalizeCleanName('(Costco) Kirkland Paper Towels')).toBe('Kirkland Paper Towels');
    });

    it('should strip status and urgency markers like (out of stock) and (urgent)', () => {
      expect(normalizeCleanName('Organic Bananas (out of stock)')).toBe('Organic Bananas');
      expect(normalizeCleanName('Eggs [unavailable] - fresh')).toBe('Eggs');
      expect(normalizeCleanName('Almond Milk (urgent!)')).toBe('Almond Milk');
    });

    it('should normalize multiple spaces, punctuation, and trim properly', () => {
      expect(normalizeCleanName('  Greek   Yogurt, Plain -- ')).toBe('Greek Yogurt, Plain');
      expect(normalizeCleanName('Sourdough Bread : ')).toBe('Sourdough Bread');
      expect(normalizeCleanName('')).toBe('');
    });
  });

  describe('Device-Name Scoped Replenishment History', () => {
    it('should upsert replenishment history scoped strictly by friendly deviceName', () => {
      const deviceMom = "Mom's Phone";
      const deviceDad = "Dad's Phone";

      db.upsertDeviceHistoryItem(deviceMom, 'Organic Whole Milk', 'Dairy', 'bottles', 1700000000000);
      db.upsertDeviceHistoryItem(deviceDad, 'Organic Whole Milk', 'Dairy', 'cartons', 1700000050000);
      db.upsertDeviceHistoryItem(deviceMom, 'Avocados', 'Produce', 'pcs', 1700000010000);

      // Verify Mom's history (sorted by last_completed_at DESC)
      const momHistory = db.getDeviceHistory(deviceMom);
      expect(momHistory.length).toBe(2);
      expect(momHistory[0].cleanName).toBe('Avocados');
      expect(momHistory[0].lastUnit).toBe('pcs');
      expect(momHistory[1].cleanName).toBe('Organic Whole Milk');
      expect(momHistory[1].lastUnit).toBe('bottles');
      expect(momHistory[1].purchaseCount).toBe(1);

      // Verify Dad's history has separate purchase record and unit
      const dadHistory = db.getDeviceHistory(deviceDad);
      expect(dadHistory.length).toBe(1);
      expect(dadHistory[0].cleanName).toBe('Organic Whole Milk');
      expect(dadHistory[0].lastUnit).toBe('cartons');
      expect(dadHistory[0].purchaseCount).toBe(1);

      // Verify empty history for unknown device name
      const kidHistory = db.getDeviceHistory("Kid's iPad");
      expect(kidHistory.length).toBe(0);
    });

    it('should increment purchaseCount and update last_completed_at on repeated completion', () => {
      const deviceName = 'Kitchen Counter iPad';
      db.upsertDeviceHistoryItem(deviceName, 'Greek Yogurt', 'Dairy', 'cups', 1000);
      db.upsertDeviceHistoryItem(deviceName, 'Greek Yogurt', 'Dairy', 'cups', 2000);
      db.upsertDeviceHistoryItem(deviceName, 'Greek Yogurt', 'Dairy', 'tubs', 3000);

      const history = db.getDeviceHistory(deviceName);
      expect(history.length).toBe(1);
      expect(history[0].purchaseCount).toBe(3);
      expect(history[0].lastUnit).toBe('tubs');
      expect(history[0].lastCompletedAt).toBe(3000);
    });
  });

  describe('Finish Shopping Atomic Batch & Unavailable Management', () => {
    it('should execute finish shopping batch atomically, updating history and item statuses', () => {
      const stateBefore = db.getState();
      const listId = stateBefore.lists[0].id;
      const deviceName = 'Shopper Mobile';

      // Insert 3 test items: 1 completed, 1 active, 1 unavailable
      const itemCompleted = {
        id: 'item_c1',
        listId,
        name: 'Fresh Strawberries (Sweet)',
        quantity: 2,
        unit: 'packs',
        category: 'Produce',
        note: '',
        completed: true,
        completedAt: 1700000000000,
        completedBy: { deviceId: 'dev_1', deviceName, color: '#10b981' },
        addedBy: { deviceId: 'dev_1', deviceName, color: '#10b981' },
        createdAt: 1699999000000,
      };

      const itemUnchecked = {
        id: 'item_u1',
        listId,
        name: 'Organic Butter',
        quantity: 1,
        unit: 'blocks',
        category: 'Dairy',
        note: '',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'dev_1', deviceName, color: '#10b981' },
        createdAt: 1699999000000,
      };

      db.upsertItem(itemCompleted);
      db.upsertItem(itemUnchecked);

      // Execute atomic finish shopping batch:
      // - archiveCompletedIds: ['item_c1']
      // - moveRemainingToUnavailableIds: ['item_u1']
      // - keepActiveRemainingIds: []
      const result = db.executeFinishShoppingBatch({
        listId,
        archiveCompletedIds: ['item_c1'],
        moveRemainingToUnavailableIds: ['item_u1'],
        keepActiveRemainingIds: [],
        device: { deviceId: 'dev_1', deviceName },
      });

      expect(result.success).toBe(true);
      expect(result.archivedCount).toBe(1);
      expect(result.markedUnavailableCount).toBe(1);

      // Verify item_c1 was deleted / archived
      const retrievedC1 = db.getItem('item_c1');
      expect(retrievedC1).toBeNull();

      // Verify item_u1 status changed to 'unavailable'
      const retrievedU1 = db.getItem('item_u1');
      expect(retrievedU1).not.toBeNull();
      expect(retrievedU1?.status).toBe('unavailable');
      expect(retrievedU1?.unavailableBy).toBe(deviceName);
      expect(retrievedU1?.unavailableAt).toBeGreaterThan(0);

      // Verify replenishment history was populated for item_c1 under deviceName
      const history = db.getDeviceHistory(deviceName);
      expect(history.length).toBe(1);
      expect(history[0].cleanName).toBe('Fresh Strawberries');
      expect(history[0].lastUnit).toBe('packs');
      expect(history[0].category).toBe('Produce');
    });

    it('should support item status update and revert to active with is_unavailable_revert flag', () => {
      const stateBefore = db.getState();
      const listId = stateBefore.lists[0].id;

      const item = {
        id: 'item_oos_1',
        listId,
        name: 'Oat Milk Barista',
        quantity: 1,
        unit: 'bottle',
        category: 'Dairy',
        note: '',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: { deviceId: 'd1', deviceName: 'Mom Phone', color: '#10b981' },
        createdAt: 1000,
      };
      db.upsertItem(item);

      // 1. Mark unavailable
      db.setItemStatus('item_oos_1', 'unavailable', {
        unavailableBy: 'Mom Phone',
        unavailableAt: 2000,
      });

      let updated = db.getItem('item_oos_1');
      expect(updated?.status).toBe('unavailable');
      expect(updated?.unavailableBy).toBe('Mom Phone');
      expect(updated?.isUnavailableRevert).toBe(false);

      // 2. Restore to active list
      db.setItemStatus('item_oos_1', 'active', {
        isUnavailableRevert: true,
      });

      updated = db.getItem('item_oos_1');
      expect(updated?.status).toBe('active');
      expect(updated?.isUnavailableRevert).toBe(true);
    });

    it('should export and restore deviceItemHistory in database backups', () => {
      const deviceName = 'Backup Test Device';
      db.upsertDeviceHistoryItem(deviceName, 'Coffee Beans', 'Beverages', 'bags', 123456);

      const state = db.getState();
      expect(state.deviceItemHistory.length).toBeGreaterThanOrEqual(1);

      const backup = {
        app: 'CartSync',
        version: 3,
        exportedAt: new Date().toISOString(),
        householdName: 'Test Household',
        lists: state.lists,
        items: state.items,
        autoListRules: state.autoListRules,
        deviceItemHistory: state.deviceItemHistory,
      };

      // Reset and restore
      db.resetDatabase();
      let stateAfterReset = db.getState();
      expect(stateAfterReset.deviceItemHistory.length).toBe(0);

      const restoreResult = db.restoreBackup(backup);
      expect(restoreResult.success).toBe(true);

      const stateAfterRestore = db.getState();
      expect(stateAfterRestore.deviceItemHistory.length).toBeGreaterThanOrEqual(1);
      const item = stateAfterRestore.deviceItemHistory.find((h) => h.cleanName === 'Coffee Beans');
      expect(item).toBeDefined();
      expect(item?.deviceName).toBe(deviceName);
    });
  });
});
