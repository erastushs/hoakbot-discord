import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.interface.ts', 'src/**/*.d.ts'],
      reportsDirectory: 'artifacts/coverage/root',
      reporter: ['text', 'json', 'json-summary'],
      thresholds: {
        branches: 54.61,
        functions: 63.62,
        lines: 60.55,
        statements: 58.55,
      },
    },
  },
});
