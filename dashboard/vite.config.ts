import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

const dashboardRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: dashboardRoot,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../dist-dashboard',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: [resolve(dashboardRoot, 'tests/setup.ts')],
    include: ['./tests/**/*.test.tsx'],
  },
});
