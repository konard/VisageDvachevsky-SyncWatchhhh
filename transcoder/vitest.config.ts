import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/worker.ts',
        '**/*.d.ts',
      ],
      include: [
        'src/**/*.ts',
      ],
      // Coverage thresholds disabled until test coverage improves
      // TODO: Gradually increase thresholds as coverage improves
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});
