import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
    // tests/ holds the Playwright e2e specs.
    exclude: [...configDefaults.exclude, 'tests/**'],
    coverage: {
      include: ['src/**'],
    },
  },
})
