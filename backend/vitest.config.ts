import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    environment: 'node',
    // Only load setup files if not in unit test mode
    setupFiles: process.env.VITEST_UNIT ? [] : ['./src/__tests__/setup.ts'],
    env: loadEnv('test', process.cwd(), ''),
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/__tests__/',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
}));
