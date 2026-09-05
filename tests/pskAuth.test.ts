import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import WebSocket from 'ws';

describe.sequential('Pre-Shared Key (PSK) Authentication Suite', () => {
  const TEST_PORT = 3108;
  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const WS_URL = `ws://localhost:${TEST_PORT}`;
  const SECRET_KEY = 'super-secret-household-psk-token-2026';
  const serverScript = path.resolve(__dirname, '../server/index.js');
  const testDbFile = path.resolve(__dirname, '../server/test-psk-cartsync.db');

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

    // Launch server with HOUSEHOLD_SECRET configured
    serverProcess = spawn('node', [serverScript], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        CART_SYNC_DB_PATH: testDbFile,
        HOUSEHOLD_SECRET: SECRET_KEY,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wait for server to boot (healthcheck returns 401 when unauthenticated, or 200 with auth)
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`${SERVER_URL}/api/health`, {
          headers: { Authorization: `Bearer ${SECRET_KEY}` },
        });
        if (res.ok) {
          ready = true;
          break;
        }
      } catch (_) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (!ready) {
      throw new Error('Authenticated sync server failed to initialize within timeout');
    }
  }, 20000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise((r) => setTimeout(r, 300));
    }
    cleanupDbFiles(testDbFile);
  });

  describe('HTTP REST Middleware Protection', () => {
    it('should reject GET /api/state without Authorization header with 401 Unauthorized', async () => {
      const res = await fetch(`${SERVER_URL}/api/state`);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
      expect(json.message).toContain('household authentication token');
    });

    it('should reject GET /api/health with invalid Bearer token with 401 Unauthorized', async () => {
      const res = await fetch(`${SERVER_URL}/api/health`, {
        headers: { Authorization: 'Bearer invalid-token-123' },
      });
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should reject POST /api/sync without token with 401 Unauthorized', async () => {
      const res = await fetch(`${SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lists: [] }),
      });
      expect(res.status).toBe(401);
    });

    it('should reject POST /api/reset without token with 401 Unauthorized', async () => {
      const res = await fetch(`${SERVER_URL}/api/reset`, { method: 'POST' });
      expect(res.status).toBe(401);
    });

    it('should reject GET /api/backup without token with 401 Unauthorized', async () => {
      const res = await fetch(`${SERVER_URL}/api/backup`);
      expect(res.status).toBe(401);
    });

    it('should allow GET /api/state when valid Authorization header is provided', async () => {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        headers: { Authorization: `Bearer ${SECRET_KEY}` },
      });
      expect(res.status).toBe(200);

      const state = await res.json();
      expect(state.lists).toBeInstanceOf(Array);
      expect(state.items).toBeInstanceOf(Array);
    });

    it('should allow GET /api/backup when valid Authorization header is provided', async () => {
      const res = await fetch(`${SERVER_URL}/api/backup`, {
        headers: { Authorization: `Bearer ${SECRET_KEY}` },
      });
      expect(res.status).toBe(200);

      const backup = await res.json();
      expect(backup.app).toBe('CartSync');
      expect(backup.lists).toBeInstanceOf(Array);
    });

    it('should allow POST /api/sync when valid Authorization header is provided', async () => {
      const res = await fetch(`${SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SECRET_KEY}`,
        },
        body: JSON.stringify({
          lists: [],
          device: { id: 'dev_psk_tester', name: 'PSK Test Device' },
        }),
      });
      expect(res.status).toBe(200);
      const synced = await res.json();
      expect(synced.devices.some((d: any) => d.id === 'dev_psk_tester')).toBe(true);
    });
  });

  describe('WebSocket Handshake & Upgrade Interception', () => {
    it('should reject unauthenticated WebSocket connection without token with code 4401', async () => {
      const ws = new WebSocket(WS_URL);

      const closeResult = await new Promise<{ code: number; reason: string }>((resolve) => {
        ws.on('close', (code, reason) => {
          resolve({ code, reason: reason.toString() });
        });
        ws.on('error', () => {
          // May fire error prior to close
        });
      });

      expect(closeResult.code).toBe(4401);
      expect(closeResult.reason).toBe('Unauthorized');
    });

    it('should reject WebSocket connection with invalid token parameter with code 4401', async () => {
      const ws = new WebSocket(`${WS_URL}?token=wrong-token-abc`);

      const closeResult = await new Promise<{ code: number }>((resolve) => {
        ws.on('close', (code) => {
          resolve({ code });
        });
        ws.on('error', () => {});
      });

      expect(closeResult.code).toBe(4401);
    });

    it('should accept WebSocket connection with valid token query parameter', async () => {
      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(SECRET_KEY)}`);

      const initialMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for authenticated WS response')), 4000);
        ws.on('message', (raw) => {
          clearTimeout(timeout);
          resolve(JSON.parse(raw.toString()));
        });
        ws.on('error', reject);
        ws.on('close', (code) => {
          reject(new Error(`WS closed unexpectedly with code ${code}`));
        });
      });

      expect(initialMessage.type).toBe('SYNC_STATE');
      expect(initialMessage.payload.lists).toBeDefined();

      ws.close();
    });

    it('should accept WebSocket connection with valid token via Sec-WebSocket-Protocol', async () => {
      const ws = new WebSocket(WS_URL, ['cartsync-auth', SECRET_KEY]);

      const initialMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout waiting for authenticated WS subprotocol')), 4000);
        ws.on('message', (raw) => {
          clearTimeout(timeout);
          resolve(JSON.parse(raw.toString()));
        });
        ws.on('error', reject);
        ws.on('close', (code) => {
          reject(new Error(`WS subprotocol closed unexpectedly with code ${code}`));
        });
      });

      expect(initialMessage.type).toBe('SYNC_STATE');
      expect(initialMessage.payload.lists).toBeDefined();

      ws.close();
    });
  });

  describe('Client Integration & Sync Token Management', () => {
    it('should store and retrieve auth token via syncClient and localStorage', async () => {
      const { syncClient } = await import('../src/sync/syncClient');

      syncClient.setAuthToken('client-test-token-789');
      expect(syncClient.getAuthToken()).toBe('client-test-token-789');
      expect(localStorage.getItem('cartsync_auth_token')).toBe('client-test-token-789');

      // Test fetchWithAuth injects Authorization header
      let capturedHeader: string | null = null;
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (_input: any, init?: any) => {
        const h = new Headers(init?.headers);
        capturedHeader = h.get('Authorization');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      };

      try {
        await syncClient.fetchWithAuth('/api/test');
        expect(capturedHeader).toBe('Bearer client-test-token-789');
      } finally {
        globalThis.fetch = originalFetch;
        syncClient.setAuthToken('');
      }

      expect(syncClient.getAuthToken()).toBe('');
      expect(localStorage.getItem('cartsync_auth_token')).toBeNull();
    });
  });
});
