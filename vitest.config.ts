import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', 'remotion-demo/**', '.next/**', 'dist/**', '.claude/**', '.worktrees/**'],
    setupFiles: ['./__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
