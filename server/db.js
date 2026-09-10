import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path: default to cartsync.db in server directory, or overridden via env
const DB_PATH = process.env.CART_SYNC_DB_PATH || path.join(__dirname, 'cartsync.db');

export class CartSyncDatabase {
  constructor(dbPath = DB_PATH) {
    this.dbPath = dbPath;
    const dbDir = path.dirname(this.dbPath);
    if (dbDir && !fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new DatabaseSync(this.dbPath);
    this.init();
  }

  init() {
    // Enable Write-Ahead Logging for high-concurrency performance
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
      this.db.exec('PRAGMA busy_timeout = 5000;');
    } catch (err) {
      console.warn('SQLite PRAGMA warning:', err);
    }

    // 1. Lists Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT 'shopping-cart',
        color TEXT DEFAULT 'emerald',
        is_default INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // 2. Items Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 1,
        unit TEXT,
        category TEXT DEFAULT 'Other',
        note TEXT,
        completed INTEGER DEFAULT 0,
        completed_at INTEGER,
        completed_by TEXT,
        added_by TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        content_updated_at INTEGER,
        contributors TEXT,
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
    `);

    // Migration: Add content_updated_at and contributors columns if missing (for existing databases)
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN content_updated_at INTEGER;');
    } catch (_) {
      // Column already exists
    }
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN contributors TEXT;');
    } catch (_) {
      // Column already exists
    }

    // Migration: Add status, is_unavailable_revert, unavailable_by, unavailable_at columns
    try {
      this.db.exec("ALTER TABLE items ADD COLUMN status TEXT DEFAULT 'active';");
    } catch (_) {}
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN is_unavailable_revert INTEGER DEFAULT 0;');
    } catch (_) {}
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN unavailable_by TEXT;');
    } catch (_) {}
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN unavailable_at INTEGER;');
    } catch (_) {}

    // 2b. Device-Name Scoped Item History Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS device_item_history (
        id TEXT PRIMARY KEY,
        device_name TEXT NOT NULL,
        clean_name TEXT NOT NULL,
        category TEXT DEFAULT 'Other',
        last_unit TEXT,
        last_completed_at INTEGER NOT NULL,
        purchase_count INTEGER DEFAULT 1,
        UNIQUE(device_name, clean_name) ON CONFLICT REPLACE
      );
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_device_history_lookup ON device_item_history(device_name, clean_name);
    `);

    // 3. Connected Devices Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#10b981',
        icon TEXT DEFAULT 'smartphone',
        is_custom_name INTEGER DEFAULT 0,
        last_seen_at INTEGER NOT NULL
      );
    `);

    // 4. Auto-List Rules Table (e.g., Gardenia -> Supermarket / Bakery)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auto_list_rules (
        id TEXT PRIMARY KEY,
        keyword TEXT NOT NULL UNIQUE,
        target_list_id TEXT NOT NULL,
        category TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (target_list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
    `);

    // 5. Household Settings & Admin Meta Table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    // Seed default data if database is fresh
    this.seedDefaultsIfEmpty();
  }

  seedDefaultsIfEmpty() {
    const listCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM lists');
    const { count } = listCountStmt.get();

    if (count === 0) {
      console.log('📦 Seeding initial CartSync SQLite database...');
      const now = Date.now();

      const defaultLists = [
        {
          id: 'list_supermarket',
          name: 'Supermarket',
          description: 'Weekly grocery run & fresh staples',
          icon: 'shopping-cart',
          color: 'emerald',
          is_default: 1,
          created_at: now - 86400000 * 2,
          updated_at: now - 86400000 * 2,
        },
        {
          id: 'list_costco',
          name: 'Costco',
          description: 'Bulk household essentials & snacks',
          icon: 'box',
          color: 'amber',
          is_default: 0,
          created_at: now - 86400000 * 2,
          updated_at: now - 86400000 * 2,
        },
        {
          id: 'list_pharmacy',
          name: 'Pharmacy',
          description: 'Health, wellness & personal care',
          icon: 'pill',
          color: 'rose',
          is_default: 0,
          created_at: now - 86400000 * 2,
          updated_at: now - 86400000 * 2,
        },
        {
          id: 'list_farmers',
          name: 'Farmers Market',
          description: 'Organic weekend market favorites',
          icon: 'carrot',
          color: 'cyan',
          is_default: 0,
          created_at: now - 86400000 * 2,
          updated_at: now - 86400000 * 2,
        },
      ];

      const insertList = this.db.prepare(`
        INSERT INTO lists (id, name, description, icon, color, is_default, created_at, updated_at)
        VALUES (@id, @name, @description, @icon, @color, @is_default, @created_at, @updated_at)
      `);

      for (const list of defaultLists) {
        insertList.run(list);
      }

      const defaultItems = [
        {
          id: 'item_1',
          list_id: 'list_supermarket',
          name: 'Organic Honeycrisp Apples',
          quantity: 6,
          unit: 'pcs',
          category: 'Produce',
          note: 'Crisp & sweet for snacking',
          completed: 0,
          completed_at: null,
          completed_by: null,
          added_by: JSON.stringify({
            deviceId: 'dev_kitchen_ipad',
            deviceName: 'Kitchen iPad',
            color: '#10b981',
          }),
          created_at: now - 3600000 * 5,
          updated_at: now - 3600000 * 5,
        },
        {
          id: 'item_2',
          list_id: 'list_supermarket',
          name: 'Oat Milk Barista Edition',
          quantity: 2,
          unit: 'cartons',
          category: 'Dairy & Eggs',
          note: 'For morning latte',
          completed: 0,
          completed_at: null,
          completed_by: null,
          added_by: JSON.stringify({
            deviceId: 'dev_dad_phone',
            deviceName: 'Dad Phone',
            color: '#3b82f6',
          }),
          created_at: now - 3600000 * 3,
          updated_at: now - 3600000 * 3,
        },
        {
          id: 'item_3',
          list_id: 'list_supermarket',
          name: 'Artisan Sourdough Loaf',
          quantity: 1,
          unit: 'loaf',
          category: 'Bakery',
          note: null,
          completed: 1,
          completed_at: now - 1800000,
          completed_by: JSON.stringify({
            deviceId: 'dev_dad_phone',
            deviceName: 'Dad Phone',
          }),
          added_by: JSON.stringify({
            deviceId: 'dev_kitchen_ipad',
            deviceName: 'Kitchen iPad',
            color: '#10b981',
          }),
          created_at: now - 3600000 * 6,
          updated_at: now - 1800000,
        },
      ];

      const insertItem = this.db.prepare(`
        INSERT INTO items (id, list_id, name, quantity, unit, category, note, completed, completed_at, completed_by, added_by, created_at, updated_at)
        VALUES (@id, @list_id, @name, @quantity, @unit, @category, @note, @completed, @completed_at, @completed_by, @added_by, @created_at, @updated_at)
      `);

      for (const item of defaultItems) {
        insertItem.run(item);
      }

      // Default registered devices
      const defaultDevices = [
        {
          id: 'dev_kitchen_ipad',
          name: 'Kitchen iPad',
          color: '#10b981',
          icon: 'tablet',
          is_custom_name: 1,
          last_seen_at: now - 60000 * 10,
        },
        {
          id: 'dev_dad_phone',
          name: 'Dad Phone',
          color: '#3b82f6',
          icon: 'smartphone',
          is_custom_name: 1,
          last_seen_at: now - 60000 * 2,
        },
      ];

      const insertDevice = this.db.prepare(`
        INSERT INTO devices (id, name, color, icon, is_custom_name, last_seen_at)
        VALUES (@id, @name, @color, @icon, @is_custom_name, @last_seen_at)
      `);

      for (const dev of defaultDevices) {
        insertDevice.run(dev);
      }

      // Default Auto-List Rules (e.g. Gardenia -> Supermarket/Bakery)
      const defaultRules = [
        {
          id: 'rule_gardenia',
          keyword: 'gardenia',
          target_list_id: 'list_supermarket',
          category: 'Bakery',
          created_at: now - 86400000,
        },
        {
          id: 'rule_kirkland',
          keyword: 'kirkland',
          target_list_id: 'list_costco',
          category: 'Household & Cleaning',
          created_at: now - 86400000,
        },
        {
          id: 'rule_tylenol',
          keyword: 'tylenol',
          target_list_id: 'list_pharmacy',
          category: 'Pharmacy & Health',
          created_at: now - 86400000,
        },
        {
          id: 'rule_advil',
          keyword: 'advil',
          target_list_id: 'list_pharmacy',
          category: 'Pharmacy & Health',
          created_at: now - 86400000,
        },
        {
          id: 'rule_vitamin',
          keyword: 'vitamin',
          target_list_id: 'list_pharmacy',
          category: 'Pharmacy & Health',
          created_at: now - 86400000,
        },
      ];

      const insertRule = this.db.prepare(`
        INSERT INTO auto_list_rules (id, keyword, target_list_id, category, created_at)
        VALUES (@id, @keyword, @target_list_id, @category, @created_at)
      `);

      for (const r of defaultRules) {
        insertRule.run(r);
      }
    }
  }

  // Get full household state formatted for clients
  getState() {
    const listRows = this.db.prepare('SELECT * FROM lists ORDER BY created_at ASC').all();
    const lists = listRows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      icon: r.icon || 'shopping-cart',
      color: r.color || 'emerald',
      isDefault: Boolean(r.is_default),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
    }));

    const itemRows = this.db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
    const items = itemRows.map((r) => ({
      id: r.id,
      listId: r.list_id,
      name: r.name,
      quantity: Number(r.quantity),
      unit: r.unit || undefined,
      category: r.category || 'Other',
      note: r.note || undefined,
      completed: Boolean(r.completed),
      completedAt: r.completed_at ? Number(r.completed_at) : null,
      completedBy: r.completed_by ? JSON.parse(r.completed_by) : null,
      addedBy: r.added_by ? JSON.parse(r.added_by) : undefined,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at),
      contentUpdatedAt: r.content_updated_at ? Number(r.content_updated_at) : undefined,
      contributors: r.contributors ? JSON.parse(r.contributors) : [],
      status: r.status || 'active',
      isUnavailableRevert: Boolean(r.is_unavailable_revert),
      unavailableBy: r.unavailable_by || null,
      unavailableAt: r.unavailable_at ? Number(r.unavailable_at) : null,
    }));

    const deviceRows = this.db.prepare('SELECT * FROM devices ORDER BY last_seen_at DESC').all();
    const devices = deviceRows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color || '#10b981',
      icon: r.icon || 'smartphone',
      isCustomName: Boolean(r.is_custom_name),
      lastActive: Number(r.last_seen_at),
      lastSeenAt: Number(r.last_seen_at),
    }));

    let autoListRules = [];
    try {
      const ruleRows = this.db.prepare('SELECT * FROM auto_list_rules ORDER BY created_at ASC').all();
      autoListRules = ruleRows.map((r) => ({
        id: r.id,
        keyword: r.keyword,
        targetListId: r.target_list_id,
        category: r.category || undefined,
        createdAt: Number(r.created_at),
      }));
    } catch (_) {}

    let deviceItemHistory = [];
    try {
      const histRows = this.db.prepare('SELECT * FROM device_item_history ORDER BY last_completed_at DESC').all();
      deviceItemHistory = histRows.map((r) => ({
        id: r.id,
        deviceName: r.device_name,
        cleanName: r.clean_name,
        category: r.category || 'Other',
        lastUnit: r.last_unit || undefined,
        lastCompletedAt: Number(r.last_completed_at),
        purchaseCount: Number(r.purchase_count),
      }));
    } catch (_) {}

    let householdName = 'Our Home';
    let adminPinConfigured = false;
    try {
      const hRow = this.db.prepare("SELECT value FROM settings WHERE key = 'household_name'").get();
      if (hRow && hRow.value) {
        householdName = hRow.value;
      }
      const pinRow = this.db.prepare("SELECT value FROM settings WHERE key = 'admin_pin_hash'").get();
      adminPinConfigured = Boolean(pinRow && pinRow.value);
    } catch (_) {}

    return {
      version: 2,
      lastSyncedAt: Date.now(),
      householdName,
      adminPinConfigured,
      lists,
      items,
      devices,
      autoListRules,
      deviceItemHistory,
    };
  }

  getItem(id) {
    const row = this.db.prepare('SELECT * FROM items WHERE id = ?').get(id);
    if (!row) return null;
    return {
      id: row.id,
      listId: row.list_id,
      name: row.name,
      quantity: Number(row.quantity),
      unit: row.unit || undefined,
      category: row.category || 'Other',
      note: row.note || undefined,
      completed: Boolean(row.completed),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
      completedBy: row.completed_by ? JSON.parse(row.completed_by) : null,
      addedBy: row.added_by ? JSON.parse(row.added_by) : undefined,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      contentUpdatedAt: row.content_updated_at ? Number(row.content_updated_at) : undefined,
      contributors: row.contributors ? JSON.parse(row.contributors) : [],
      status: row.status || 'active',
      isUnavailableRevert: Boolean(row.is_unavailable_revert),
      unavailableBy: row.unavailable_by || null,
      unavailableAt: row.unavailable_at ? Number(row.unavailable_at) : null,
    };
  }

  getDeviceHistory(deviceName) {
    if (!deviceName) return [];
    const trimmed = String(deviceName).trim();
    const rows = this.db.prepare(`
      SELECT * FROM device_item_history
      WHERE LOWER(device_name) = LOWER(?)
      ORDER BY last_completed_at DESC
    `).all(trimmed);

    return rows.map((r) => ({
      id: r.id,
      deviceName: r.device_name,
      cleanName: r.clean_name,
      category: r.category || 'Other',
      lastUnit: r.last_unit || undefined,
      lastCompletedAt: Number(r.last_completed_at),
      purchaseCount: Number(r.purchase_count),
    }));
  }

  upsertDeviceHistoryItem(deviceNameOrObj, cleanName, category, lastUnit, lastCompletedAt) {
    const item = typeof deviceNameOrObj === 'object' && deviceNameOrObj !== null
      ? deviceNameOrObj
      : {
          deviceName: deviceNameOrObj,
          cleanName,
          category,
          lastUnit,
          lastCompletedAt,
        };

    const trimmedDevName = String(item.deviceName || '').trim();
    const clean = String(item.cleanName || '').trim();
    if (!trimmedDevName || !clean) return;

    const now = Date.now();
    const existing = this.db.prepare(`
      SELECT * FROM device_item_history
      WHERE LOWER(device_name) = LOWER(?) AND LOWER(clean_name) = LOWER(?)
    `).get(trimmedDevName, clean);

    const count = existing ? (Number(existing.purchase_count) + (item.purchaseCountIncrement || 1)) : (item.purchaseCount || 1);
    const id = existing ? existing.id : (item.id || `hist_${now}_${Math.random().toString(36).substring(2, 7)}`);

    this.db.prepare(`
      INSERT INTO device_item_history (id, device_name, clean_name, category, last_unit, last_completed_at, purchase_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(device_name, clean_name) DO UPDATE SET
        category = excluded.category,
        last_unit = excluded.last_unit,
        last_completed_at = excluded.last_completed_at,
        purchase_count = excluded.purchase_count
    `).run(
      id,
      item.deviceName,
      item.cleanName,
      item.category || 'Other',
      item.lastUnit || null,
      item.lastCompletedAt || now,
      count
    );
  }

  setItemStatus(itemId, status, options = {}) {
    const now = Date.now();
    const existing = this.getItem(itemId);
    if (!existing) return null;

    const isUnavailableRevert = options.isUnavailableRevert !== undefined ? (options.isUnavailableRevert ? 1 : 0) : (existing.isUnavailableRevert ? 1 : 0);
    const unavailableBy = options.unavailableBy !== undefined ? options.unavailableBy : (status === 'unavailable' ? existing.unavailableBy : null);
    const unavailableAt = options.unavailableAt !== undefined ? options.unavailableAt : (status === 'unavailable' ? existing.unavailableAt : null);

    this.db.prepare(`
      UPDATE items
      SET status = ?,
          is_unavailable_revert = ?,
          unavailable_by = ?,
          unavailable_at = ?,
          updated_at = ?
      WHERE id = ?
    `).run(status, isUnavailableRevert, unavailableBy, unavailableAt, now, itemId);

    return this.getItem(itemId);
  }

  upsertItem(incomingItem) {
    const now = Date.now();
    const existing = this.getItem(incomingItem.id);

    let finalItem = incomingItem;
    if (existing) {
      // Content resolution: LWW based on content updatedAt
      const existingContentTime = existing.contentUpdatedAt ?? (
        existing.completed ? (existing.createdAt || existing.updatedAt || 0) : (existing.updatedAt || 0)
      );
      const incomingContentTime = incomingItem.contentUpdatedAt ?? (
        incomingItem.completed ? (incomingItem.createdAt || incomingItem.updatedAt || 0) : (incomingItem.updatedAt || 0)
      );
      const useIncomingContent = incomingContentTime >= existingContentTime;
      const contentBase = useIncomingContent ? incomingItem : existing;
      const resolvedContentTime = Math.max(existingContentTime, incomingContentTime);

      // Completion resolution: LWW based on completion action timestamp
      let useIncomingCompletion = false;

      if (incomingItem.completed && !existing.completed) {
        const incomingCompTime = incomingItem.completedAt ?? incomingItem.updatedAt ?? 0;
        const existingUncheckTime = existing.updatedAt ?? 0;
        useIncomingCompletion = incomingCompTime >= existingUncheckTime;
      } else if (!incomingItem.completed && existing.completed) {
        const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
        const incomingUncheckTime = incomingItem.updatedAt ?? 0;
        const incContentTime = incomingItem.contentUpdatedAt ?? 0;
        const isContentOnlyEdit = incContentTime > 0 && incContentTime === (incomingItem.updatedAt ?? 0);
        useIncomingCompletion = !isContentOnlyEdit && incomingUncheckTime > existingCompTime;
      } else if (incomingItem.completed && existing.completed) {
        const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
        const incomingCompTime = incomingItem.completedAt ?? incomingItem.updatedAt ?? 0;
        useIncomingCompletion = incomingCompTime >= existingCompTime;
      } else {
        useIncomingCompletion = (incomingItem.updatedAt ?? 0) >= (existing.updatedAt ?? 0);
      }
      const completionBase = useIncomingCompletion ? incomingItem : existing;

      // Status resolution
      const resolvedStatus = incomingItem.status !== undefined ? incomingItem.status : (existing.status || 'active');
      const resolvedIsUnavailableRevert = incomingItem.isUnavailableRevert !== undefined
        ? (incomingItem.completed ? false : Boolean(incomingItem.isUnavailableRevert))
        : (incomingItem.completed ? false : Boolean(existing.isUnavailableRevert));

      finalItem = {
        id: incomingItem.id,
        listId: contentBase.listId,
        name: contentBase.name,
        quantity: contentBase.quantity !== undefined ? contentBase.quantity : 1,
        unit: contentBase.unit || undefined,
        category: contentBase.category || 'Other',
        note: contentBase.note || undefined,
        addedBy: contentBase.addedBy,
        createdAt: Math.min(existing.createdAt || now, incomingItem.createdAt || now),
        completed: Boolean(completionBase.completed),
        completedAt: completionBase.completed ? (completionBase.completedAt || now) : null,
        completedBy: completionBase.completed ? completionBase.completedBy : null,
        contentUpdatedAt: resolvedContentTime,
        contributors: contentBase.contributors || existing.contributors || [],
        updatedAt: Math.max(existing.updatedAt || 0, incomingItem.updatedAt || 0, resolvedContentTime),
        status: resolvedStatus,
        isUnavailableRevert: resolvedIsUnavailableRevert,
        unavailableBy: incomingItem.unavailableBy !== undefined ? incomingItem.unavailableBy : (existing.unavailableBy || null),
        unavailableAt: incomingItem.unavailableAt !== undefined ? incomingItem.unavailableAt : (existing.unavailableAt || null),
      };
    } else {
      finalItem = {
        ...incomingItem,
        status: incomingItem.status || 'active',
        isUnavailableRevert: Boolean(incomingItem.isUnavailableRevert),
        unavailableBy: incomingItem.unavailableBy || null,
        unavailableAt: incomingItem.unavailableAt || null,
      };
    }

    const stmt = this.db.prepare(`
      INSERT INTO items (
        id, list_id, name, quantity, unit, category, note, completed,
        completed_at, completed_by, added_by, created_at, updated_at,
        content_updated_at, contributors, status, is_unavailable_revert,
        unavailable_by, unavailable_at
      )
      VALUES (
        @id, @list_id, @name, @quantity, @unit, @category, @note, @completed,
        @completed_at, @completed_by, @added_by, @created_at, @updated_at,
        @content_updated_at, @contributors, @status, @is_unavailable_revert,
        @unavailable_by, @unavailable_at
      )
      ON CONFLICT(id) DO UPDATE SET
        list_id = excluded.list_id,
        name = excluded.name,
        quantity = excluded.quantity,
        unit = excluded.unit,
        category = excluded.category,
        note = excluded.note,
        completed = excluded.completed,
        completed_at = excluded.completed_at,
        completed_by = excluded.completed_by,
        added_by = excluded.added_by,
        updated_at = excluded.updated_at,
        content_updated_at = excluded.content_updated_at,
        contributors = excluded.contributors,
        status = excluded.status,
        is_unavailable_revert = excluded.is_unavailable_revert,
        unavailable_by = excluded.unavailable_by,
        unavailable_at = excluded.unavailable_at
    `);

    stmt.run({
      id: finalItem.id,
      list_id: finalItem.listId,
      name: finalItem.name,
      quantity: finalItem.quantity !== undefined ? finalItem.quantity : 1,
      unit: finalItem.unit || null,
      category: finalItem.category || 'Other',
      note: finalItem.note || null,
      completed: finalItem.completed ? 1 : 0,
      completed_at: finalItem.completedAt || null,
      completed_by: finalItem.completedBy ? JSON.stringify(finalItem.completedBy) : null,
      added_by: finalItem.addedBy ? JSON.stringify(finalItem.addedBy) : null,
      created_at: finalItem.createdAt || now,
      updated_at: finalItem.updatedAt || now,
      content_updated_at: finalItem.contentUpdatedAt || null,
      contributors: finalItem.contributors && finalItem.contributors.length > 0 ? JSON.stringify(finalItem.contributors) : null,
      status: finalItem.status || 'active',
      is_unavailable_revert: finalItem.isUnavailableRevert ? 1 : 0,
      unavailable_by: finalItem.unavailableBy || null,
      unavailable_at: finalItem.unavailableAt || null,
    });

    return finalItem;
  }

  // Atomic Finish Shopping Batch Execution
  executeFinishShoppingBatch({
    deviceName,
    device,
    completedItemIds = [],
    archiveCompletedIds = [],
    moveRemainingToUnavailable = false,
    moveRemainingToUnavailableIds = [],
    uncheckedItemIds = [],
    keepActiveRemainingIds = [],
    listId = null,
  }) {
    const activeDeviceName = deviceName || device?.deviceName || 'Household';
    const cIds = completedItemIds.length > 0 ? completedItemIds : archiveCompletedIds;
    const shouldMove = moveRemainingToUnavailable || moveRemainingToUnavailableIds.length > 0;
    const uncheckIds = moveRemainingToUnavailableIds.length > 0 ? moveRemainingToUnavailableIds : uncheckedItemIds;

    const now = Date.now();
    let archivedCount = 0;
    let markedUnavailableCount = 0;

    // Begin SQLite Transaction
    this.db.exec('BEGIN TRANSACTION;');
    try {
      // 1. Move unchecked items to unavailable if requested
      if (shouldMove && uncheckIds.length > 0) {
        const markUnavailableStmt = this.db.prepare(`
          UPDATE items
          SET status = 'unavailable',
              unavailable_by = ?,
              unavailable_at = ?,
              updated_at = ?
          WHERE id = ? AND completed = 0
        `);
        for (const uncheckId of uncheckIds) {
          const res = markUnavailableStmt.run(activeDeviceName, now, now, uncheckId);
          if (res.changes > 0) markedUnavailableCount++;
        }
      }

      // 2. Archive completed items into device_item_history scoped strictly to active deviceName
      if (cIds.length > 0) {
        const findItemStmt = this.db.prepare('SELECT * FROM items WHERE id = ?');
        const upsertHistStmt = this.db.prepare(`
          INSERT INTO device_item_history (id, device_name, clean_name, category, last_unit, last_completed_at, purchase_count)
          VALUES (@id, @device_name, @clean_name, @category, @last_unit, @last_completed_at, @purchase_count)
          ON CONFLICT(device_name, clean_name) DO UPDATE SET
            category = excluded.category,
            last_unit = excluded.last_unit,
            last_completed_at = excluded.last_completed_at,
            purchase_count = device_item_history.purchase_count + 1
        `);

        for (const cId of cIds) {
          const itemRow = findItemStmt.get(cId);
          if (itemRow) {
            // Clean name normalization (strip status tags, bracketed tags, trailing punctuation, extra spaces)
            let clean = (itemRow.name || '').trim();
            clean = clean.replace(/\s*(\[|\()(unavailable|out of stock|restocked|reverted|oos|revert|urgent!?|sweet|ripene?d?|costco)(\]|\))\s*/gi, ' ');
            clean = clean.replace(/\s*\(\d+\s*[a-zA-Z]+\)\s*$/g, '');
            clean = clean.replace(/\s+#\w+/g, ' ');
            clean = clean.replace(/^[\s\-–—:*#"'`]+|[\s\-–—:*#"'`]+$/g, '');
            clean = clean.replace(/\s+/g, ' ').trim();
            clean = clean.replace(/^[\s\-–—:*#"'`]+|[\s\-–—:*#"'`]+$/g, '').trim();

            if (clean && activeDeviceName) {
              const histId = `hist_${now}_${Math.random().toString(36).substring(2, 7)}`;
              upsertHistStmt.run({
                id: histId,
                device_name: activeDeviceName,
                clean_name: clean,
                category: itemRow.category || 'Other',
                last_unit: itemRow.unit || null,
                last_completed_at: itemRow.completed_at ? Number(itemRow.completed_at) : now,
                purchase_count: 1,
              });
            }
          }
        }

        // Delete completed items
        const deleteItemStmt = this.db.prepare('DELETE FROM items WHERE id = ?');
        for (const cId of cIds) {
          const res = deleteItemStmt.run(cId);
          if (res.changes > 0) archivedCount++;
        }
      }

      // 3. Restore any previously unavailable items on this list back to active list with is_unavailable_revert = 1
      // Note: do not immediately revert items that were just marked unavailable in step 1!
      const uncheckPlaceholder = uncheckIds.length > 0 ? uncheckIds.map(() => '?').join(',') : null;
      if (listId) {
        if (uncheckPlaceholder && shouldMove) {
          this.db.prepare(`
            UPDATE items
            SET status = 'active',
                is_unavailable_revert = 1,
                unavailable_by = NULL,
                unavailable_at = NULL,
                updated_at = ?
            WHERE status = 'unavailable' AND list_id = ? AND id NOT IN (${uncheckPlaceholder})
          `).run(now, listId, ...uncheckIds);
        } else {
          this.db.prepare(`
            UPDATE items
            SET status = 'active',
                is_unavailable_revert = 1,
                unavailable_by = NULL,
                unavailable_at = NULL,
                updated_at = ?
            WHERE status = 'unavailable' AND list_id = ?
          `).run(now, listId);
        }
      } else {
        if (uncheckPlaceholder && shouldMove) {
          this.db.prepare(`
            UPDATE items
            SET status = 'active',
                is_unavailable_revert = 1,
                unavailable_by = NULL,
                unavailable_at = NULL,
                updated_at = ?
            WHERE status = 'unavailable' AND id NOT IN (${uncheckPlaceholder})
          `).run(now, ...uncheckIds);
        } else {
          this.db.prepare(`
            UPDATE items
            SET status = 'active',
                is_unavailable_revert = 1,
                unavailable_by = NULL,
                unavailable_at = NULL,
                updated_at = ?
            WHERE status = 'unavailable'
          `).run(now);
        }
      }

      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }

    const state = this.getState();
    return {
      success: true,
      archivedCount,
      markedUnavailableCount,
      state,
    };
  }


  deleteItem(itemId) {
    const stmt = this.db.prepare('DELETE FROM items WHERE id = ?');
    stmt.run(itemId);
  }

  upsertList(list) {
    const stmt = this.db.prepare(`
      INSERT INTO lists (id, name, description, icon, color, is_default, created_at, updated_at)
      VALUES (@id, @name, @description, @icon, @color, @is_default, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        icon = excluded.icon,
        color = excluded.color,
        is_default = excluded.is_default,
        updated_at = excluded.updated_at
    `);

    const now = Date.now();
    stmt.run({
      id: list.id,
      name: list.name,
      description: list.description || null,
      icon: list.icon || 'shopping-cart',
      color: list.color || 'emerald',
      is_default: list.isDefault ? 1 : 0,
      created_at: list.createdAt || now,
      updated_at: list.updatedAt || now,
    });
  }

  deleteList(listId) {
    // Delete items and rules first to enforce cascade cleanly
    this.db.prepare('DELETE FROM auto_list_rules WHERE target_list_id = ?').run(listId);
    this.db.prepare('DELETE FROM items WHERE list_id = ?').run(listId);
    this.db.prepare('DELETE FROM lists WHERE id = ?').run(listId);
  }

  upsertDevice(device) {
    const stmt = this.db.prepare(`
      INSERT INTO devices (id, name, color, icon, is_custom_name, last_seen_at)
      VALUES (@id, @name, @color, @icon, @is_custom_name, @last_seen_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        color = excluded.color,
        icon = excluded.icon,
        is_custom_name = excluded.is_custom_name,
        last_seen_at = excluded.last_seen_at
    `);

    const now = Date.now();
    stmt.run({
      id: device.id,
      name: device.name,
      color: device.color || '#10b981',
      icon: device.icon || 'smartphone',
      is_custom_name: device.isCustomName ? 1 : 0,
      last_seen_at: device.lastSeenAt || device.lastActive || now,
    });
  }

  deleteDevice(deviceId) {
    const stmt = this.db.prepare('DELETE FROM devices WHERE id = ?');
    stmt.run(deviceId);
  }

  upsertAutoListRule(rule) {
    const stmt = this.db.prepare(`
      INSERT INTO auto_list_rules (id, keyword, target_list_id, category, created_at)
      VALUES (@id, @keyword, @target_list_id, @category, @created_at)
      ON CONFLICT(id) DO UPDATE SET
        keyword = excluded.keyword,
        target_list_id = excluded.target_list_id,
        category = excluded.category
    `);

    const now = Date.now();
    stmt.run({
      id: rule.id,
      keyword: rule.keyword.trim().toLowerCase(),
      target_list_id: rule.targetListId,
      category: rule.category || null,
      created_at: rule.createdAt || now,
    });
  }

  deleteAutoListRule(ruleId) {
    const stmt = this.db.prepare('DELETE FROM auto_list_rules WHERE id = ?');
    stmt.run(ruleId);
  }

  setHouseholdName(name) {
    const trimmed = (name || '').trim() || 'Our Home';
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('household_name', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(trimmed, Date.now());
    return trimmed;
  }

  setAdminPin(pinHash) {
    if (!pinHash) {
      this.db.prepare("DELETE FROM settings WHERE key = 'admin_pin_hash'").run();
      return false;
    }
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('admin_pin_hash', ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(pinHash, Date.now());
    return true;
  }

  verifyAdminPin(pinHash) {
    const row = this.db.prepare("SELECT value FROM settings WHERE key = 'admin_pin_hash'").get();
    if (!row || !row.value) return true; // No admin pin configured, anyone can act as admin
    return row.value === pinHash;
  }

  syncState({ lists, items, device, autoListRules, householdName, deviceItemHistory }) {
    if (householdName) {
      this.setHouseholdName(householdName);
    }
    if (lists && Array.isArray(lists)) {
      for (const l of lists) {
        this.upsertList(l);
      }
    }
    if (items && Array.isArray(items)) {
      for (const i of items) {
        this.upsertItem(i);
      }
    }
    if (autoListRules && Array.isArray(autoListRules)) {
      for (const r of autoListRules) {
        this.upsertAutoListRule(r);
      }
    }
    if (deviceItemHistory && Array.isArray(deviceItemHistory)) {
      for (const h of deviceItemHistory) {
        this.upsertDeviceHistoryItem(h);
      }
    }
    if (device && device.id) {
      this.upsertDevice(device);
    }
    return this.getState();
  }

  restoreBackup(backupData) {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.exec('DELETE FROM items;');
      this.db.exec('DELETE FROM lists;');
      this.db.exec('DELETE FROM devices;');
      this.db.exec('DELETE FROM auto_list_rules;');
      this.db.exec('DELETE FROM device_item_history;');

      if (backupData.householdName) {
        this.setHouseholdName(backupData.householdName);
      }
      if (Array.isArray(backupData.lists)) {
        for (const l of backupData.lists) {
          this.upsertList(l);
        }
      }
      if (Array.isArray(backupData.items)) {
        for (const i of backupData.items) {
          this.upsertItem(i);
        }
      }
      if (Array.isArray(backupData.autoListRules)) {
        for (const r of backupData.autoListRules) {
          this.upsertAutoListRule(r);
        }
      }
      if (Array.isArray(backupData.devices)) {
        for (const d of backupData.devices) {
          this.upsertDevice(d);
        }
      }
      if (Array.isArray(backupData.deviceItemHistory)) {
        for (const h of backupData.deviceItemHistory) {
          this.upsertDeviceHistoryItem(h);
        }
      }
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
    const state = this.getState();
    return {
      success: true,
      state,
    };
  }

  resetDatabase() {
    this.db.exec('DELETE FROM items;');
    this.db.exec('DELETE FROM lists;');
    this.db.exec('DELETE FROM devices;');
    this.db.exec('DELETE FROM auto_list_rules;');
    this.db.exec('DELETE FROM device_item_history;');
    this.seedDefaultsIfEmpty();
    return this.getState();
  }


  close() {
    try {
      this.db.close();
    } catch (_) {}
  }
}

// Singleton database instance
export const cartSyncDb = new CartSyncDatabase();
