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
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
    `);

    // Migration: Add content_updated_at column if missing (for existing databases)
    try {
      this.db.exec('ALTER TABLE items ADD COLUMN content_updated_at INTEGER;');
    } catch (_) {
      // Column already exists
    }

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
    };
  }

  upsertItem(incomingItem) {
    const now = Date.now();
    const existing = this.getItem(incomingItem.id);

    let finalItem = incomingItem;
    if (existing) {
      // Content resolution: LWW based on content updatedAt
      // When an item has contentUpdatedAt, use it directly.
      // For items without contentUpdatedAt (legacy or completion-only toggles):
      //   - completed items: use createdAt (content wasn't changed by the completion toggle)
      //   - uncompleted items: use updatedAt (last content edit)
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
      // Uses same logic as client-side resolveItemConflict
      let useIncomingCompletion = false;

      if (incomingItem.completed && !existing.completed) {
        const incomingCompTime = incomingItem.completedAt ?? incomingItem.updatedAt ?? 0;
        const existingUncheckTime = existing.updatedAt ?? 0;
        useIncomingCompletion = incomingCompTime >= existingUncheckTime;
      } else if (!incomingItem.completed && existing.completed) {
        const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
        const incomingUncheckTime = incomingItem.updatedAt ?? 0;
        // Distinguish content-only edits from explicit unchecks
        const incContentTime = incomingItem.contentUpdatedAt ?? 0;
        const isContentOnlyEdit = incContentTime > 0 && incContentTime === (incomingItem.updatedAt ?? 0);
        useIncomingCompletion = !isContentOnlyEdit && incomingUncheckTime > existingCompTime;
      } else if (incomingItem.completed && existing.completed) {
        const existingCompTime = existing.completedAt ?? existing.updatedAt ?? 0;
        const incomingCompTime = incomingItem.completedAt ?? incomingItem.updatedAt ?? 0;
        useIncomingCompletion = incomingCompTime >= existingCompTime;
      } else {
        // Both uncompleted
        useIncomingCompletion = (incomingItem.updatedAt ?? 0) >= (existing.updatedAt ?? 0);
      }
      const completionBase = useIncomingCompletion ? incomingItem : existing;

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
        updatedAt: Math.max(existing.updatedAt || 0, incomingItem.updatedAt || 0, resolvedContentTime),
      };
    }

    const stmt = this.db.prepare(`
      INSERT INTO items (id, list_id, name, quantity, unit, category, note, completed, completed_at, completed_by, added_by, created_at, updated_at, content_updated_at)
      VALUES (@id, @list_id, @name, @quantity, @unit, @category, @note, @completed, @completed_at, @completed_by, @added_by, @created_at, @updated_at, @content_updated_at)
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
        content_updated_at = excluded.content_updated_at
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
    });

    return finalItem;
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

  syncState({ lists, items, device, autoListRules, householdName }) {
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
    if (device && device.id) {
      this.upsertDevice(device);
    }
    return this.getState();
  }

  resetDatabase() {
    this.db.exec('DELETE FROM items;');
    this.db.exec('DELETE FROM lists;');
    this.db.exec('DELETE FROM devices;');
    this.db.exec('DELETE FROM auto_list_rules;');
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
