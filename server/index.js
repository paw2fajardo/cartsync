import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'household-data.json');

const app = express();
app.use(cors());
app.use(express.json());

// Initial Household Data if not exists
const DEFAULT_STATE = {
  version: 1,
  lastSyncedAt: Date.now(),
  lists: [
    {
      id: 'list_supermarket',
      name: 'Supermarket',
      description: 'Weekly grocery run & fresh staples',
      icon: 'shopping-cart',
      color: 'emerald',
      isDefault: true,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'list_costco',
      name: 'Costco',
      description: 'Bulk household essentials & snacks',
      icon: 'box',
      color: 'amber',
      isDefault: false,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'list_pharmacy',
      name: 'Pharmacy',
      description: 'Health, wellness & personal care',
      icon: 'pill',
      color: 'rose',
      isDefault: false,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
    {
      id: 'list_farmers',
      name: 'Farmers Market',
      description: 'Organic weekend market favorites',
      icon: 'carrot',
      color: 'cyan',
      isDefault: false,
      createdAt: Date.now() - 86400000 * 2,
      updatedAt: Date.now() - 86400000 * 2,
    },
  ],
  items: [
    {
      id: 'item_1',
      listId: 'list_supermarket',
      name: 'Organic Honeycrisp Apples',
      quantity: 6,
      unit: 'pcs',
      category: 'Produce',
      note: 'Crisp & sweet for snacking',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      createdAt: Date.now() - 3600000 * 5,
      updatedAt: Date.now() - 3600000 * 5,
    },
    {
      id: 'item_2',
      listId: 'list_supermarket',
      name: 'Oat Milk Barista Edition',
      quantity: 2,
      unit: 'cartons',
      category: 'Dairy & Eggs',
      note: 'For morning latte',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_dad_phone',
        deviceName: 'Dad Phone',
        color: '#3b82f6',
      },
      createdAt: Date.now() - 3600000 * 4,
      updatedAt: Date.now() - 3600000 * 4,
    },
    {
      id: 'item_3',
      listId: 'list_supermarket',
      name: 'Artisan Sourdough Loaf',
      quantity: 1,
      unit: 'loaf',
      category: 'Bakery',
      note: 'Freshly baked',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      createdAt: Date.now() - 3600000 * 3,
      updatedAt: Date.now() - 3600000 * 3,
    },
    {
      id: 'item_4',
      listId: 'list_supermarket',
      name: 'Hass Avocados',
      quantity: 4,
      unit: 'pcs',
      category: 'Produce',
      note: 'Slightly soft to touch',
      completed: true,
      completedAt: Date.now() - 1800000,
      completedBy: {
        deviceId: 'dev_dad_phone',
        deviceName: 'Dad Phone',
        color: '#3b82f6',
      },
      addedBy: {
        deviceId: 'dev_dad_phone',
        deviceName: 'Dad Phone',
        color: '#3b82f6',
      },
      createdAt: Date.now() - 3600000 * 6,
      updatedAt: Date.now() - 1800000,
    },
    {
      id: 'item_5',
      listId: 'list_supermarket',
      name: 'Free-Range Brown Eggs',
      quantity: 12,
      unit: 'pack',
      category: 'Dairy & Eggs',
      note: 'Large carton',
      completed: true,
      completedAt: Date.now() - 2400000,
      completedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      addedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      createdAt: Date.now() - 3600000 * 7,
      updatedAt: Date.now() - 2400000,
    },
    {
      id: 'item_c1',
      listId: 'list_costco',
      name: 'Paper Towels (12 Rolls)',
      quantity: 1,
      unit: 'pack',
      category: 'Household & Cleaning',
      note: 'Kirkland signature',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_dad_phone',
        deviceName: 'Dad Phone',
        color: '#3b82f6',
      },
      createdAt: Date.now() - 3600000 * 12,
      updatedAt: Date.now() - 3600000 * 12,
    },
    {
      id: 'item_c2',
      listId: 'list_costco',
      name: 'Sparkling Mineral Water (24pk)',
      quantity: 2,
      unit: 'boxes',
      category: 'Beverages',
      note: 'Lime or Grapefruit',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      createdAt: Date.now() - 3600000 * 10,
      updatedAt: Date.now() - 3600000 * 10,
    },
    {
      id: 'item_p1',
      listId: 'list_pharmacy',
      name: 'Vitamin D3 2000 IU',
      quantity: 1,
      unit: 'bottle',
      category: 'Pharmacy & Health',
      note: 'Softgels',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_dad_phone',
        deviceName: 'Dad Phone',
        color: '#3b82f6',
      },
      createdAt: Date.now() - 3600000 * 20,
      updatedAt: Date.now() - 3600000 * 20,
    },
    {
      id: 'item_p2',
      listId: 'list_pharmacy',
      name: 'Hydrocolloid Band-Aids',
      quantity: 1,
      unit: 'box',
      category: 'Pharmacy & Health',
      note: 'Waterproof',
      completed: false,
      completedAt: null,
      completedBy: null,
      addedBy: {
        deviceId: 'dev_kitchen_ipad',
        deviceName: 'Kitchen iPad',
        color: '#10b981',
      },
      createdAt: Date.now() - 3600000 * 18,
      updatedAt: Date.now() - 3600000 * 18,
    },
  ],
  devices: [
    {
      id: 'dev_kitchen_ipad',
      name: 'Kitchen iPad',
      color: '#10b981',
      icon: 'tablet',
      isCustomName: true,
      lastActive: Date.now() - 300000,
    },
    {
      id: 'dev_dad_phone',
      name: 'Dad Phone',
      color: '#3b82f6',
      icon: 'smartphone',
      isCustomName: true,
      lastActive: Date.now() - 600000,
    },
  ],
};

function loadState() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load state from disk:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let householdState = loadState();

function persistState() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(householdState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist state to disk:', err);
  }
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Koffan Grocery Sync Server',
    version: householdState.version,
    activeWsConnections: wss ? wss.clients.size : 0,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

app.get('/api/state', (req, res) => {
  res.json(householdState);
});

app.post('/api/sync', (req, res) => {
  const { lists, items, device } = req.body;
  let modified = false;

  if (device && device.id) {
    const dIdx = householdState.devices.findIndex((d) => d.id === device.id);
    if (dIdx >= 0) {
      householdState.devices[dIdx] = { ...householdState.devices[dIdx], ...device, lastActive: Date.now() };
    } else {
      householdState.devices.push({ ...device, lastActive: Date.now() });
    }
    modified = true;
  }

  if (Array.isArray(lists)) {
    for (const l of lists) {
      const idx = householdState.lists.findIndex((item) => item.id === l.id);
      if (idx >= 0) {
        if (!householdState.lists[idx].updatedAt || l.updatedAt >= householdState.lists[idx].updatedAt) {
          householdState.lists[idx] = l;
          modified = true;
        }
      } else {
        householdState.lists.push(l);
        modified = true;
      }
    }
  }

  if (Array.isArray(items)) {
    for (const item of items) {
      const idx = householdState.items.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        if (!householdState.items[idx].updatedAt || item.updatedAt >= householdState.items[idx].updatedAt) {
          householdState.items[idx] = item;
          modified = true;
        }
      } else {
        householdState.items.push(item);
        modified = true;
      }
    }
  }

  if (modified) {
    householdState.version += 1;
    householdState.lastSyncedAt = Date.now();
    persistState();
    broadcast({
      type: 'SYNC_STATE',
      deviceId: device ? device.id : 'server',
      timestamp: Date.now(),
      payload: householdState,
    });
  }

  res.json(householdState);
});

app.post('/api/reset', (req, res) => {
  householdState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  householdState.version += 1;
  householdState.lastSyncedAt = Date.now();
  persistState();
  broadcast({
    type: 'SYNC_STATE',
    deviceId: 'server',
    timestamp: Date.now(),
    payload: householdState,
  });
  res.json({ status: 'reset_successful', state: householdState });
});

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message, senderWs = null) {
  const payloadStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== senderWs) {
      client.send(payloadStr);
    }
  });
}

// Connected clients device map
const clientDeviceMap = new Map();

wss.on('connection', (ws, req) => {
  console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);

  // Send current state immediately on connection
  ws.send(
    JSON.stringify({
      type: 'SYNC_STATE',
      deviceId: 'server',
      timestamp: Date.now(),
      payload: householdState,
    })
  );

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, deviceId, payload, timestamp } = message;

      if (!type) return;

      switch (type) {
        case 'DEVICE_PING': {
          if (payload && payload.id) {
            clientDeviceMap.set(ws, payload.id);
            const idx = householdState.devices.findIndex((d) => d.id === payload.id);
            if (idx >= 0) {
              householdState.devices[idx] = { ...householdState.devices[idx], ...payload, lastActive: Date.now() };
            } else {
              householdState.devices.push({ ...payload, lastActive: Date.now() });
            }
            householdState.lastSyncedAt = Date.now();
            persistState();

            // Broadcast device presence
            broadcast({
              type: 'DEVICE_LIST',
              deviceId: payload.id,
              timestamp: Date.now(),
              payload: householdState.devices,
            });
          }
          break;
        }

        case 'ITEM_UPSERT': {
          if (payload && payload.id) {
            const idx = householdState.items.findIndex((i) => i.id === payload.id);
            if (idx >= 0) {
              householdState.items[idx] = payload;
            } else {
              householdState.items.unshift(payload);
            }
            householdState.version += 1;
            householdState.lastSyncedAt = Date.now();
            persistState();
            broadcast(message, ws);
          }
          break;
        }

        case 'ITEM_DELETE': {
          if (payload && payload.itemId) {
            householdState.items = householdState.items.filter((i) => i.id !== payload.itemId);
            householdState.version += 1;
            householdState.lastSyncedAt = Date.now();
            persistState();
            broadcast(message, ws);
          }
          break;
        }

        case 'LIST_UPSERT': {
          if (payload && payload.id) {
            const idx = householdState.lists.findIndex((l) => l.id === payload.id);
            if (idx >= 0) {
              householdState.lists[idx] = payload;
            } else {
              householdState.lists.push(payload);
            }
            householdState.version += 1;
            householdState.lastSyncedAt = Date.now();
            persistState();
            broadcast(message, ws);
          }
          break;
        }

        case 'LIST_DELETE': {
          if (payload && payload.listId) {
            householdState.lists = householdState.lists.filter((l) => l.id !== payload.listId);
            householdState.items = householdState.items.filter((i) => i.listId !== payload.listId);
            householdState.version += 1;
            householdState.lastSyncedAt = Date.now();
            persistState();
            broadcast(message, ws);
          }
          break;
        }

        case 'BATCH_UPDATE': {
          if (payload) {
            if (Array.isArray(payload.lists)) {
              householdState.lists = payload.lists;
            }
            if (Array.isArray(payload.items)) {
              householdState.items = payload.items;
            }
            householdState.version += 1;
            householdState.lastSyncedAt = Date.now();
            persistState();
            broadcast(message, ws);
          }
          break;
        }

        default:
          console.log('[WS] Unknown message type:', type);
      }
    } catch (err) {
      console.error('[WS] Error processing message:', err);
    }
  });

  ws.on('close', () => {
    const devId = clientDeviceMap.get(ws);
    clientDeviceMap.delete(ws);
    console.log(`[WS] Client disconnected (${devId || 'unknown'})`);
  });
});

server.listen(PORT, () => {
  console.log(`🛒 Koffan Grocery Sync Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server ready on ws://localhost:${PORT}`);
});
