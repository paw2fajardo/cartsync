import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import WebSocket from 'ws';

describe.sequential('WebSocket & Express Household Sync Server Verification', () => {
  const TEST_PORT = 3105;
  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const WS_URL = `ws://localhost:${TEST_PORT}`;
  const serverScript = path.resolve(__dirname, '../server/index.js');
  const testDbFile = path.resolve(__dirname, '../server/test-cartsync.db');

  let serverProcess: ChildProcess;

  function cleanupDbFiles(filePath: string) {
    for (const ext of ['', '-wal', '-shm']) {
      const f = filePath + ext;
      if (fs.existsSync(f)) {
        try {
          fs.unlinkSync(f);
        } catch (_) {}
      }
    }
  }

  beforeAll(async () => {
    cleanupDbFiles(testDbFile);

    // Start server process on dedicated test port with isolated test DB
    serverProcess = spawn('node', [serverScript], {
      env: { ...process.env, PORT: String(TEST_PORT), CART_SYNC_DB_PATH: testDbFile },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server to become healthy
    let ready = false;
    for (let i = 0; i < 30; i++) {
      try {
        const res = await fetch(`${SERVER_URL}/api/health`);
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (_) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!ready) {
      throw new Error('Sync server failed to start within timeout');
    }
  }, 15000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      // Wait briefly for process to exit and release file locks
      await new Promise((r) => setTimeout(r, 300));
    }
    // Clean up temporary sqlite db
    cleanupDbFiles(testDbFile);
  });

  describe('REST Endpoints', () => {
    it('GET /api/health should return ok status and server metadata', async () => {
      const res = await fetch(`${SERVER_URL}/api/health`);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('ok');
      expect(data.app).toBe('CartSync Grocery Sync Server');
      expect(data.database).toContain('sqlite3');
      expect(typeof data.version).toBe('number');
      expect(typeof data.activeWsConnections).toBe('number');
      expect(typeof data.uptimeSeconds).toBe('number');
    });

    it('GET /api/state should return household lists, items, and devices', async () => {
      const res = await fetch(`${SERVER_URL}/api/state`);
      expect(res.status).toBe(200);

      const state = await res.json();
      expect(state.lists).toBeInstanceOf(Array);
      expect(state.items).toBeInstanceOf(Array);
      expect(state.devices).toBeInstanceOf(Array);

      expect(state.lists.some((l: any) => l.id === 'list_supermarket')).toBe(true);
      expect(state.lists.some((l: any) => l.id === 'list_costco')).toBe(true);
    });

    it('POST /api/sync should merge lists and items into household state', async () => {
      const newListItem = {
        id: 'list_rest_sync_test',
        name: 'Specialty Asian Market',
        icon: 'store',
        color: 'rose',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const res = await fetch(`${SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lists: [newListItem],
          device: {
            id: 'dev_rest_tester',
            name: 'REST Tester Device',
            color: '#3b82f6',
            icon: 'laptop',
          },
        }),
      });

      expect(res.status).toBe(200);
      const syncedState = await res.json();

      expect(syncedState.lists.some((l: any) => l.id === 'list_rest_sync_test')).toBe(true);
      expect(syncedState.devices.some((d: any) => d.id === 'dev_rest_tester')).toBe(true);
    });

    it('POST /api/reset should restore default household state', async () => {
      const res = await fetch(`${SERVER_URL}/api/reset`, { method: 'POST' });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.status).toBe('reset_successful');
      expect(data.state.lists.length).toBe(4);
    });
  });

  describe('WebSocket Real-Time Sync & Broadcast', () => {
    it('should receive initial SYNC_STATE upon establishing WebSocket connection', async () => {
      const ws = new WebSocket(WS_URL);

      const initialMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WS timeout waiting for SYNC_STATE')), 4000);
        ws.on('message', (raw) => {
          clearTimeout(timeout);
          resolve(JSON.parse(raw.toString()));
        });
        ws.on('error', reject);
      });

      expect(initialMessage.type).toBe('SYNC_STATE');
      expect(initialMessage.payload.lists).toBeDefined();
      expect(initialMessage.payload.items).toBeDefined();

      ws.close();
    });

    it('should handle DEVICE_PING and broadcast DEVICE_LIST', async () => {
      const wsClient1 = new WebSocket(WS_URL);
      const wsClient2 = new WebSocket(WS_URL);

      await Promise.all([
        new Promise((r) => wsClient1.on('open', r)),
        new Promise((r) => wsClient2.on('open', r)),
      ]);

      // Client 2 listens for DEVICE_LIST broadcast
      const broadcastPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for DEVICE_LIST broadcast')), 4000);
        wsClient2.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'DEVICE_LIST') {
            clearTimeout(timeout);
            resolve(msg);
          }
        });
      });

      // Client 1 sends ping
      wsClient1.send(
        JSON.stringify({
          type: 'DEVICE_PING',
          deviceId: 'dev_ws_pinger',
          timestamp: Date.now(),
          payload: {
            id: 'dev_ws_pinger',
            name: 'Pantry Wall Display',
            color: '#14b8a6',
            icon: 'monitor',
            isCustomName: true,
          },
        })
      );

      const receivedMsg = await broadcastPromise;
      expect(receivedMsg.type).toBe('DEVICE_LIST');
      expect(receivedMsg.payload.some((d: any) => d.id === 'dev_ws_pinger')).toBe(true);

      wsClient1.close();
      wsClient2.close();
    });

    it('should handle ITEM_UPSERT and broadcast item update to connected peers', async () => {
      const wsSender = new WebSocket(WS_URL);
      const wsReceiver = new WebSocket(WS_URL);

      await Promise.all([
        new Promise((r) => wsSender.on('open', r)),
        new Promise((r) => wsReceiver.on('open', r)),
      ]);

      const testItem = {
        id: 'ws_item_test_1',
        listId: 'list_supermarket',
        name: 'Fresh Strawberries',
        quantity: 2,
        unit: 'packs',
        category: 'Produce',
        completed: false,
        completedAt: null,
        completedBy: null,
        addedBy: {
          deviceId: 'dev_sender',
          deviceName: 'Sender Phone',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const broadcastPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for ITEM_UPSERT broadcast')), 4000);
        wsReceiver.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ITEM_UPSERT' && msg.payload?.id === testItem.id) {
            clearTimeout(timeout);
            resolve(msg);
          }
        });
      });

      wsSender.send(
        JSON.stringify({
          type: 'ITEM_UPSERT',
          deviceId: 'dev_sender',
          timestamp: Date.now(),
          payload: testItem,
        })
      );

      const broadcastMsg = await broadcastPromise;
      expect(broadcastMsg.payload.name).toBe('Fresh Strawberries');
      expect(broadcastMsg.payload.quantity).toBe(2);

      // Verify server state was updated
      const stateRes = await fetch(`${SERVER_URL}/api/state?t=${Date.now()}`);
      const state = await stateRes.json();
      expect(state.items.some((i: any) => i.id === testItem.id)).toBe(true);

      wsSender.close();
      wsReceiver.close();
    });

    it('should handle ITEM_DELETE and broadcast to connected peers', async () => {
      const wsSender = new WebSocket(WS_URL);
      const wsReceiver = new WebSocket(WS_URL);

      await Promise.all([
        new Promise((r) => wsSender.on('open', r)),
        new Promise((r) => wsReceiver.on('open', r)),
      ]);

      const deleteTarget = {
        id: 'ws_item_delete_target',
        listId: 'list_supermarket',
        name: 'Item To Delete',
        quantity: 1,
        category: 'Produce',
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Seed the item first
      wsSender.send(
        JSON.stringify({
          type: 'ITEM_UPSERT',
          deviceId: 'dev_sender',
          timestamp: Date.now(),
          payload: deleteTarget,
        })
      );

      // Wait a moment for server processing
      await new Promise((r) => setTimeout(r, 50));

      const broadcastPromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for ITEM_DELETE broadcast')), 4000);
        wsReceiver.on('message', (raw) => {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'ITEM_DELETE' && msg.payload?.itemId === 'ws_item_delete_target') {
            clearTimeout(timeout);
            resolve(msg);
          }
        });
      });

      wsSender.send(
        JSON.stringify({
          type: 'ITEM_DELETE',
          deviceId: 'dev_sender',
          timestamp: Date.now(),
          payload: { itemId: 'ws_item_delete_target' },
        })
      );

      const broadcastMsg = await broadcastPromise;
      expect(broadcastMsg.payload.itemId).toBe('ws_item_delete_target');

      // Verify server state reflects deletion
      const stateRes = await fetch(`${SERVER_URL}/api/state?t=${Date.now()}`);
      const state = await stateRes.json();
      expect(state.items.some((i: any) => i.id === 'ws_item_delete_target')).toBe(false);

      wsSender.close();
      wsReceiver.close();
    });
  });
});
