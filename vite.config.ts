import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // The core is pure, so tests need no DOM. Node is faster, and defaulting to it
    // makes the "logic tests, not DOM snapshots" intent explicit.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
