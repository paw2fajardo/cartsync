/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import packageJson from './package.json';

let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse --short HEAD').toString().trim();
} catch (_) {
  gitCommit = process.env.VITE_GIT_COMMIT || 'docker';
}

const buildTime = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});
