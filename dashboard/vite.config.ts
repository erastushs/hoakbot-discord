import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const dashboardRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dashboardRoot, '');

  return {
    root: dashboardRoot,
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': {
          target: resolveAPIProxyTarget(env['VITE_API_BASE_URL']),
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: '../dist-dashboard',
      emptyOutDir: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: [resolve(dashboardRoot, 'tests/setup.ts')],
      include: ['./tests/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        include: ['./src/**/*.{ts,tsx}'],
        exclude: ['./src/**/*.d.ts'],
        reportsDirectory: '../artifacts/coverage/dashboard',
        reporter: ['text', 'json', 'json-summary'],
        thresholds: {
          branches: 49.93,
          functions: 57.09,
          lines: 56.56,
          statements: 53.82,
        },
      },
    },
  };
});

function resolveAPIProxyTarget(apiBaseUrl?: string): string {
  if (!apiBaseUrl || apiBaseUrl.startsWith('/')) {
    return 'http://localhost:3000';
  }

  return new URL(apiBaseUrl).origin;
}
