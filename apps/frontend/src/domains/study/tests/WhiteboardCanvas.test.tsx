import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WhiteboardCanvas, WhiteboardCanvasRef } from '../components/whiteboard/WhiteboardCanvas';
import React from 'react';

// Mock fabric module completely to avoid jsdom canvas issues
vi.mock('fabric', () => {
  const createMockCanvas = () => ({
    dispose: vi.fn(),
    width: 800,
    height: 600,
    isDrawingMode: false,
    freeDrawingBrush: { color: 'black', width: 1 },
    selection: true,
    defaultCursor: 'default',
    hoverCursor: 'move',
    on: vi.fn(),
    off: vi.fn(),
    requestRenderAll: vi.fn(),
    renderAll: vi.fn(),
    discardActiveObject: vi.fn(),
    getPointer: vi.fn(() => ({ x: 0, y: 0 })),
    remove: vi.fn(),
    add: vi.fn(),
    setActiveObject: vi.fn(),
    getObjects: vi.fn(() => []),
    clear: vi.fn(),
  });

  class MockCanvas {
    constructor() {
      Object.assign(this, createMockCanvas());
    }
  }

  class MockPencilBrush {
    color = 'black';
    width = 1;
  }

  return {
    fabric: {
      Canvas: MockCanvas,
      PencilBrush: MockPencilBrush,
      Rect: class {},
      IText: class {},
      util: {
        enlivenObjects: vi.fn((objs, callback) => callback(objs)),
      },
    },
  };
});

describe('WhiteboardCanvas', () => {
  it('renders a canvas element', () => {
    render(<WhiteboardCanvas />);
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('renders with custom width and height', () => {
    render(<WhiteboardCanvas width={1000} height={800} />);
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('exposes ref methods for external control', () => {
    const ref = React.createRef<WhiteboardCanvasRef>();
    render(<WhiteboardCanvas ref={ref} />);

    // Ref should be defined with the expected methods
    expect(ref.current).toBeDefined();
    expect(typeof ref.current?.add).toBe('function');
    expect(typeof ref.current?.modify).toBe('function');
    expect(typeof ref.current?.remove).toBe('function');
    expect(typeof ref.current?.clear).toBe('function');
  });
});
