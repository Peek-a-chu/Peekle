import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
// import * as React from 'react';

// Ensure React is available globally for tests
// global.React = React;

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
} as any;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
