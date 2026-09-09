import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@dimcraft/core': fileURLToPath(new URL('./packages/core/src/', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: [
      'tests/**/*.test.{ts,mjs}',
      'packages/*/tests/**/*.test.ts',
      'apps/*/tests/**/*.test.ts',
    ],
  },
})
