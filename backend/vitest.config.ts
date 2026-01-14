import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    // Only load setup files if not in unit test mode
    setupFiles: process.env.VITEST_UNIT ? [] : ['./src/__tests__/setup.ts'],
    env: loadEnv('test', process.cwd(), ''),
    // Run test files sequentially to avoid database race conditions
    // Integration tests share a database and can interfere when run in parallel
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
        'src/index.ts',
        'src/config/',
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
}));
