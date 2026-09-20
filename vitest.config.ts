import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so tests do not load the TanStack Start/Nitro plugins.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
