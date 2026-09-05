import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Containerization & Docker Configuration Suite', () => {
  const rootDir = path.resolve(__dirname, '..');
  const dockerfilePath = path.join(rootDir, 'Dockerfile');
  const dockerComposePath = path.join(rootDir, 'docker-compose.yml');
  const dockerignorePath = path.join(rootDir, '.dockerignore');

  it('should have a valid multi-stage Dockerfile using Node 22 Alpine', () => {
    expect(fs.existsSync(dockerfilePath)).toBe(true);
    const dockerfile = fs.readFileSync(dockerfilePath, 'utf-8');

    // Multi-stage builder & runner
    expect(dockerfile).toMatch(/FROM node:22-alpine AS builder/i);
    expect(dockerfile).toMatch(/FROM node:22-alpine AS runner/i);

    // Build step
    expect(dockerfile).toContain('npm run build');

    // Production dependencies
    expect(dockerfile).toMatch(/npm ci --omit=dev/i);

    // Persistent storage directory
    expect(dockerfile).toContain('/app/data');

    // Port and healthcheck
    expect(dockerfile).toContain('EXPOSE 3001');
    expect(dockerfile).toContain('HEALTHCHECK');
    expect(dockerfile).toContain('/api/health');

    // Entrypoint command
    expect(dockerfile).toContain('CMD ["node", "server/index.js"]');
  });

  it('should have a valid docker-compose.yml with persistent volumes and healthchecks', () => {
    expect(fs.existsSync(dockerComposePath)).toBe(true);
    const composeContent = fs.readFileSync(dockerComposePath, 'utf-8');

    // Service definition
    expect(composeContent).toContain('cartsync:');
    expect(composeContent).toContain('container_name: cartsync-app');

    // Port mappings
    expect(composeContent).toMatch(/3001:3001/);

    // Volume configuration
    expect(composeContent).toContain('cartsync-data:/app/data');
    expect(composeContent).toContain('cartsync-data:');

    // Environment variables
    expect(composeContent).toContain('NODE_ENV=production');
    expect(composeContent).toContain('CART_SYNC_DB_PATH=/app/data/cartsync.db');

    // Healthcheck
    expect(composeContent).toContain('/api/health');
  });

  it('should have a comprehensive .dockerignore file', () => {
    expect(fs.existsSync(dockerignorePath)).toBe(true);
    const ignoreContent = fs.readFileSync(dockerignorePath, 'utf-8');

    // Critical exclusions
    expect(ignoreContent).toContain('node_modules');
    expect(ignoreContent).toContain('.git');
    expect(ignoreContent).toContain('dist');
    expect(ignoreContent).toContain('server/*.db');
    expect(ignoreContent).toContain('tests');
  });

  it('should verify server/index.js handles dist directory serving for single-container deployment', () => {
    const serverIndexPath = path.join(rootDir, 'server', 'index.js');
    const serverIndexContent = fs.readFileSync(serverIndexPath, 'utf-8');

    expect(serverIndexContent).toContain('express.static');
    expect(serverIndexContent).toContain('distPath');
    expect(serverIndexContent).toContain('/api/health');
  });
});
