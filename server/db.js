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
    this.db = new DatabaseSync(this.dbPath);
    this.init();
  }

  init() {
    // Enable Write-Ahead Logging for high-concurrency performance
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA foreign_keys = ON;');
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
        FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
      );
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
    }));

    const deviceRows = this.db.prepare('SELECT * FROM devices ORDER BY last_seen_at DESC').all();
    const devices = deviceRows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color || '#10b981',
      icon: r.icon || 'smartphone',
      isCustomName: Boolean(r.is_custom_name),
      lastSeenAt: Number(r.last_seen_at),
    }));

    return {
      version: 2,
      lastSyncedAt: Date.now(),
      lists,
      items,
      devices,
    };
  }

  upsertItem(item) {
    const stmt = this.db.prepare(`
      INSERT INTO items (id, list_id, name, quantity, unit, category, note, completed, completed_at, completed_by, added_by, created_at, updated_at)
      VALUES (@id, @list_id, @name, @quantity, @unit, @category, @note, @completed, @completed_at, @completed_by, @added_by, @created_at, @updated_at)
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
        updated_at = excluded.updated_at
    `);

    const now = Date.now();
    stmt.run({
      id: item.id,
      list_id: item.listId,
      name: item.name,
      quantity: item.quantity !== undefined ? item.quantity : 1,
      unit: item.unit || null,
      category: item.category || 'Other',
      note: item.note || null,
      completed: item.completed ? 1 : 0,
      completed_at: item.completedAt || null,
      completed_by: item.completedBy ? JSON.stringify(item.completedBy) : null,
      added_by: item.addedBy ? JSON.stringify(item.addedBy) : null,
      created_at: item.createdAt || now,
      updated_at: item.updatedAt || now,
    });
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
    // Delete items first to enforce cascade cleanly
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

  syncState({ lists, items, device }) {
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
    if (device && device.id) {
      this.upsertDevice(device);
    }
    return this.getState();
  }

  resetDatabase() {
    this.db.exec('DELETE FROM items;');
    this.db.exec('DELETE FROM lists;');
    this.db.exec('DELETE FROM devices;');
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
