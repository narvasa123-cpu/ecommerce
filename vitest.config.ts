import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL:
        process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1:55432/orven_test',
      DIRECT_URL:
        process.env.TEST_DATABASE_URL || 'postgresql://postgres@127.0.0.1:55432/orven_test',
      PAYMENT_MODE: 'sandbox',
      APP_URL: 'http://localhost:3000',
    },
  },
});
