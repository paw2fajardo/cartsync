import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Production Build & PWA Artifacts Verification', () => {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const publicDir = path.join(rootDir, 'public');

  it('should verify dist directory and production assets exist', () => {
    expect(fs.existsSync(distDir)).toBe(true);
    expect(fs.existsSync(path.join(distDir, 'index.html'))).toBe(true);

    const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('<!doctype html>');
    expect(indexHtml).toContain('id="root"');
    expect(indexHtml).toContain('rel="manifest"');
  });

  it('should verify compiled bundle assets in dist/assets', () => {
    const assetsDir = path.join(distDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);

    const files = fs.readdirSync(assetsDir);
    const jsFiles = files.filter(f => f.endsWith('.js'));
    const cssFiles = files.filter(f => f.endsWith('.css'));

    expect(jsFiles.length).toBeGreaterThan(0);
    expect(cssFiles.length).toBeGreaterThan(0);

    // Verify main bundle has substantial compiled content
    const mainJs = fs.readFileSync(path.join(assetsDir, jsFiles[0]), 'utf-8');
    expect(mainJs.length).toBeGreaterThan(50000); // production React bundle
  });

  it('should verify PWA manifest configuration', () => {
    const manifestPath = path.join(publicDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeInstanceOf(Array);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  it('should verify PWA service worker (sw.js)', () => {
    const swPath = path.join(publicDir, 'sw.js');
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, 'utf-8');
    expect(swContent).toContain('install');
    expect(swContent).toContain('fetch');
  });

  it('should verify PWA icons exist in public directory', () => {
    expect(fs.existsSync(path.join(publicDir, 'icon-192.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'icon-512.svg'))).toBe(true);
    expect(fs.existsSync(path.join(publicDir, 'favicon.svg'))).toBe(true);
  });
});
