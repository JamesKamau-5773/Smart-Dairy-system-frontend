import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    // Playwright owns e2e/; Vitest would otherwise pick up its *.spec.js files.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
  }
});
