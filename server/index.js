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

// Shared Household Pre-Shared Key (Bearer Token)
export function getHouseholdSecret() {
  return process.env.HOUSEHOLD_SECRET || process.env.SYNC_AUTH_TOKEN || '';
}

// HTTP Authentication Middleware for /api/* routes
export function authMiddleware(req, res, next) {
  res.set('Cache-Control', 'no-store');
  const secret = getHouseholdSecret();
  if (!secret) {
    return next(); // Open mode for local development
  }

  const authHeader = req.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : null;

  if (!token || token !== secret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing household authentication token',
    });
  }

  next();
}

// Intercept and authenticate all /api routes
app.use('/api', authMiddleware);

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

app.get('/api/backup', (req, res) => {
  const state = cartSyncDb.getState();
  res.json({
    app: 'CartSync',
    version: state.version || 2,
    exportedAt: new Date().toISOString(),
    ...state,
  });
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

// Extract authentication token from incoming WebSocket request
export function extractWsToken(req) {
  if (!req) return null;

  // 1. Query parameters: ?token=xyz or ?auth=xyz
  try {
    const parsedUrl = new URL(req.url, 'http://localhost');
    const queryToken =
      parsedUrl.searchParams.get('token') ||
      parsedUrl.searchParams.get('auth') ||
      parsedUrl.searchParams.get('key') ||
      parsedUrl.searchParams.get('bearer');
    if (queryToken) return queryToken.trim();
  } catch (_) {}

  // 2. Authorization header: Bearer <token>
  const authHeader = req.headers && (req.headers['authorization'] || req.headers['Authorization']);
  if (authHeader) {
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }

  // 3. Sec-WebSocket-Protocol: e.g. "cartsync-auth, <token>" or "cartsync-auth.<token>" or "<token>"
  const wsProtocol = req.headers && req.headers['sec-websocket-protocol'];
  if (wsProtocol) {
    const parts = String(wsProtocol)
      .split(',')
      .map((p) => p.trim());
    for (const part of parts) {
      if (part.startsWith('cartsync-auth.')) {
        return part.replace('cartsync-auth.', '').trim();
      }
    }
    const candidates = parts.filter(
      (p) => p !== 'cartsync-auth' && p !== 'bearer' && p !== 'websocket'
    );
    if (candidates.length > 0) {
      return candidates[0];
    }
    if (parts.length === 1 && parts[0] !== 'cartsync-auth') {
      return parts[0];
    }
  }

  return null;
}

// Create HTTP and WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({
  noServer: true,
  handleProtocols: (protocols) => {
    const secret = getHouseholdSecret();
    if (protocols.has('cartsync-auth')) return 'cartsync-auth';
    if (secret && protocols.has(secret)) return secret;
    return Array.from(protocols)[0] || false;
  },
});

server.on('upgrade', (req, socket, head) => {
  const secret = getHouseholdSecret();
  if (secret) {
    const token = extractWsToken(req);
    if (!token || token !== secret) {
      // Reject unauthorized connection attempts with code 4401 or immediate socket closure
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.close(4401, 'Unauthorized');
      });
      return;
    }
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

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
            const canonicalItem = cartSyncDb.upsertItem(payload);
            broadcast({
              ...message,
              payload: canonicalItem,
            }, ws);
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
