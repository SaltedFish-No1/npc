import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage'
    },
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts']
  }
});
