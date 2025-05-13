import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/mocks/**',
        '**/*.d.ts',
        'src/tests/setup.js',
        'vitest.config.js'
      ]
    },
    mockReset: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}) 