import { defineConfig } from '@playwright/test';

const port = process.env.PLAYWRIGHT_PORT ?? '43188';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    ...(process.env.CI ? {} : { channel: 'msedge' }),
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://browser-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'isolated-browser-test-key',
      VITE_API_BASE_URL: `http://127.0.0.1:${port}`,
    },
  },
});
