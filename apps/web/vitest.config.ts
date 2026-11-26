import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    fileParallelism: false,
    env: {
      VITE_SUPABASE_URL: 'https://unit-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'isolated-unit-test-key',
    },
  },
});
