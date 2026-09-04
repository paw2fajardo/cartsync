import { GroceryItem, GroceryList } from '../types';

const DB_NAME = 'cartsync_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('lists')) {
        db.createObjectStore('lists', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('items')) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('listId', 'listId', { unique: false });
        itemStore.createIndex('completed', 'completed', { unique: false });
      }

      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

// Fallback to localStorage if IndexedDB is blocked in some environments
const LS_LISTS_KEY = 'cartsync_lists_v1';
const LS_ITEMS_KEY = 'cartsync_items_v1';

export async function getAllLists(): Promise<GroceryList[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lists', 'readonly');
      const store = tx.objectStore('lists');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for lists:', err);
    const raw = localStorage.getItem(LS_LISTS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveList(list: GroceryList): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('lists', 'readwrite');
      const store = tx.objectStore('lists');
      const request = store.put(list);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for saveList:', err);
  }

  // Dual-write to localStorage for instant backup & sync consistency
  try {
    const lists = await getAllLists();
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    localStorage.setItem(LS_LISTS_KEY, JSON.stringify(lists));
  } catch (_) {}
}

export async function deleteListFromStorage(listId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['lists', 'items'], 'readwrite');
      const listStore = tx.objectStore('lists');
      listStore.delete(listId);

      // Also delete associated items
      const itemStore = tx.objectStore('items');
      const index = itemStore.index('listId');
      const request = index.openCursor(IDBKeyRange.only(listId));
      request.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for deleteList:', err);
  }

  try {
    const raw = localStorage.getItem(LS_LISTS_KEY);
    if (raw) {
      const lists: GroceryList[] = JSON.parse(raw);
      localStorage.setItem(LS_LISTS_KEY, JSON.stringify(lists.filter((l) => l.id !== listId)));
    }
    const rawItems = localStorage.getItem(LS_ITEMS_KEY);
    if (rawItems) {
      const items: GroceryItem[] = JSON.parse(rawItems);
      localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items.filter((i) => i.listId !== listId)));
    }
  } catch (_) {}
}

export async function getAllItems(): Promise<GroceryItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('items', 'readonly');
      const store = tx.objectStore('items');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for items:', err);
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
}

export async function saveItem(item: GroceryItem): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for saveItem:', err);
  }

  try {
    const items = await getAllItems();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items));
  } catch (_) {}
}

export async function deleteItemFromStorage(itemId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('items', 'readwrite');
      const store = tx.objectStore('items');
      const request = store.delete(itemId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IDB fallback to localStorage for deleteItem:', err);
  }

  try {
    const raw = localStorage.getItem(LS_ITEMS_KEY);
    if (raw) {
      const items: GroceryItem[] = JSON.parse(raw);
      localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items.filter((i) => i.id !== itemId)));
    }
  } catch (_) {}
}

export async function bulkSaveData(lists: GroceryList[], items: GroceryItem[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['lists', 'items'], 'readwrite');
      const listStore = tx.objectStore('lists');
      const itemStore = tx.objectStore('items');

      lists.forEach((list) => listStore.put(list));
      items.forEach((item) => itemStore.put(item));

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IDB bulkSaveData fallback:', err);
  }

  try {
    localStorage.setItem(LS_LISTS_KEY, JSON.stringify(lists));
    localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(items));
  } catch (_) {}
}
