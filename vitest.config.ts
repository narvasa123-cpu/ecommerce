import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(process.cwd(), 'src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: {
      DATABASE_URL: 'file:./test.db',
      PAYMENT_MODE: 'sandbox',
      APP_URL: 'http://localhost:3000',
    },
  },
});
