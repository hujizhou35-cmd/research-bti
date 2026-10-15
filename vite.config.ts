/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Client bundle; the production site also has Pages Functions and D1.
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
