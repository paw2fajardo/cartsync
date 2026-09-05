import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { cartSyncDb } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

// REST Endpoints
app.get('/api/health', (req, res) => {
  const state = cartSyncDb.getState();
  res.json({
    status: 'ok',
    app: 'CartSync Grocery Sync Server',
    database: 'sqlite3 (cartsync.db)',
    version: state.version || 2,
    activeWsConnections: wss ? wss.clients.size : 0,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
  });
});

app.get('/api/state', (req, res) => {
  res.json(cartSyncDb.getState());
});

app.post('/api/sync', (req, res) => {
  const syncedState = cartSyncDb.syncState(req.body);

  broadcast({
    type: 'SYNC_STATE',
    deviceId: req.body.device ? req.body.device.id : 'server',
    timestamp: Date.now(),
    payload: syncedState,
  });

  res.json(syncedState);
});

app.post('/api/reset', (req, res) => {
  const freshState = cartSyncDb.resetDatabase();

  broadcast({
    type: 'SYNC_STATE',
    deviceId: 'server',
    timestamp: Date.now(),
    payload: freshState,
  });

  res.json({ status: 'reset_successful', state: freshState });
});

// Serve static frontend assets in production if dist/ exists
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

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

  // Send current state from SQLite immediately on connection
  const currentState = cartSyncDb.getState();
  ws.send(
    JSON.stringify({
      type: 'SYNC_STATE',
      deviceId: 'server',
      timestamp: Date.now(),
      payload: currentState,
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
            cartSyncDb.upsertDevice(payload);

            const devices = cartSyncDb.getState().devices;
            broadcast({
              type: 'DEVICE_LIST',
              deviceId: payload.id,
              timestamp: Date.now(),
              payload: devices,
            });
          }
          break;
        }

        case 'DEVICE_DELETE': {
          if (payload && payload.deviceId) {
            cartSyncDb.deleteDevice(payload.deviceId);
            const devices = cartSyncDb.getState().devices;
            broadcast({
              type: 'DEVICE_LIST',
              deviceId: deviceId || 'server',
              timestamp: Date.now(),
              payload: devices,
            });
          }
          break;
        }

        case 'ITEM_UPSERT': {
          if (payload && payload.id) {
            cartSyncDb.upsertItem(payload);
            broadcast(message, ws);
          }
          break;
        }

        case 'ITEM_DELETE': {
          if (payload && payload.itemId) {
            cartSyncDb.deleteItem(payload.itemId);
            broadcast(message, ws);
          }
          break;
        }

        case 'LIST_UPSERT': {
          if (payload && payload.id) {
            cartSyncDb.upsertList(payload);
            broadcast(message, ws);
          }
          break;
        }

        case 'LIST_DELETE': {
          if (payload && payload.listId) {
            cartSyncDb.deleteList(payload.listId);
            broadcast(message, ws);
          }
          break;
        }

        case 'AUTO_LIST_RULE_UPSERT': {
          if (payload && payload.id) {
            cartSyncDb.upsertAutoListRule(payload);
            broadcast(message, ws);
          }
          break;
        }

        case 'AUTO_LIST_RULE_DELETE': {
          if (payload && payload.ruleId) {
            cartSyncDb.deleteAutoListRule(payload.ruleId);
            broadcast(message, ws);
          }
          break;
        }

        case 'HOUSEHOLD_NAME_UPDATE': {
          if (payload && payload.householdName) {
            const updatedName = cartSyncDb.setHouseholdName(payload.householdName);
            broadcast({
              type: 'HOUSEHOLD_NAME_UPDATE',
              deviceId: deviceId || 'server',
              timestamp: Date.now(),
              payload: { householdName: updatedName },
            });
          }
          break;
        }

        case 'ADMIN_PIN_UPDATE': {
          if (payload) {
            cartSyncDb.setAdminPin(payload.pinHash || null);
            broadcast({
              type: 'ADMIN_PIN_UPDATE',
              deviceId: deviceId || 'server',
              timestamp: Date.now(),
              payload: { adminPinConfigured: Boolean(payload.pinHash) },
            });
          }
          break;
        }

        case 'BATCH_UPDATE': {
          if (payload) {
            if (payload.householdName) {
              cartSyncDb.setHouseholdName(payload.householdName);
            }
            if (Array.isArray(payload.lists)) {
              for (const l of payload.lists) {
                cartSyncDb.upsertList(l);
              }
            }
            if (Array.isArray(payload.items)) {
              for (const i of payload.items) {
                cartSyncDb.upsertItem(i);
              }
            }
            if (Array.isArray(payload.autoListRules)) {
              for (const r of payload.autoListRules) {
                cartSyncDb.upsertAutoListRule(r);
              }
            }
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
  console.log(`🛒 CartSync SQLite Grocery Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server ready on ws://localhost:${PORT}`);
});
