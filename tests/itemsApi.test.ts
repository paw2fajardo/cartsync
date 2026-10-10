import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

describe.sequential('GET /api/v1/items external endpoint', () => {
  const TEST_PORT = 3110;
  const SERVER_URL = `http://localhost:${TEST_PORT}`;
  const serverScript = path.resolve(__dirname, '../server/index.js');
  const testDbFile = path.resolve(__dirname, '../server/test-v1-api.db');

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

    serverProcess = spawn('node', [serverScript], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        CART_SYNC_DB_PATH: testDbFile,
        HOUSEHOLD_SECRET: 'test-api-secret',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let ready = false;
    for (let i = 0; i < 50; i++) {
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
  }, 20000);

  afterAll(async () => {
    if (serverProcess) {
      serverProcess.kill();
      await new Promise((r) => setTimeout(r, 300));
    }
    cleanupDbFiles(testDbFile);
  });

  it('rejects unauthenticated requests when HOUSEHOLD_SECRET is configured', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items`);
    expect(res.status).toBe(401);
  });

  it('rejects invalid token requests', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items`, {
      headers: {
        Authorization: 'Bearer wrong-secret',
      },
    });
    expect(res.status).toBe(401);
  });

  it('returns items list with valid token', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items`, {
      headers: {
        Authorization: 'Bearer test-api-secret',
      },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('items');
    expect(body).toHaveProperty('count');
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.count).toBe(body.items.length);
    expect(body.items.length).toBeGreaterThan(0);

    const item = body.items[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('name');
    expect(item).toHaveProperty('listId');
    expect(item).toHaveProperty('status');
  });

  it('filters items by listId', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items?listId=list_supermarket`, {
      headers: {
        Authorization: 'Bearer test-api-secret',
      },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items.every((it: any) => it.listId === 'list_supermarket')).toBe(true);
  });

  it('filters items by status', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items?status=active`, {
      headers: {
        Authorization: 'Bearer test-api-secret',
      },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items.every((it: any) => it.status === 'active')).toBe(true);
  });

  it('filters items by completed status', async () => {
    const res = await fetch(`${SERVER_URL}/api/v1/items?completed=false`, {
      headers: {
        Authorization: 'Bearer test-api-secret',
      },
    });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.items.every((it: any) => it.completed === false)).toBe(true);
  });
});
