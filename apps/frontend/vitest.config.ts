import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

const svgPlugin = () => {
  return {
    name: 'svg-loader',
    transform: (_: string, id: string) => {
      if (id.endsWith('.svg')) {
        return `
          import React from 'react';
          const SvgIcon = (props) => React.createElement('svg', props);
          export default SvgIcon;
        `;
      }
      return null;
    },
  };
};

export default defineConfig({
  plugins: [react() as any, svgPlugin() as any],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/**/*.spec.ts', // Playwright E2E tests
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
