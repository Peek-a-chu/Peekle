import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhiteboardCanvas } from '../components/whiteboard/WhiteboardCanvas';

// Using vi.hoisted to ensure mock instance is available
const { mockCanvasInstance } = vi.hoisted(() => {
  return {
    mockCanvasInstance: {
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
      getPointer: vi.fn(() => ({ x: 0, y: 0 })),
      remove: vi.fn(),
      add: vi.fn(),
      setActiveObject: vi.fn(),
    },
  };
});

vi.mock('fabric', () => {
  return {
    fabric: {
      Canvas: class {
        constructor() {
          return mockCanvasInstance;
        }
      },
    },
  };
});

describe('WhiteboardCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvasInstance.isDrawingMode = false; // Reset state
  });

  it('renders a canvas element', () => {
    render(<WhiteboardCanvas />);
    // If fabric is mocked, it won't wrap the element in real DOM unless mock logic does so.
    // We just check for canvas.
    expect(document.querySelector('canvas')).toBeInTheDocument();
  });

  it('sets isDrawingMode to true when activeTool is pen', () => {
    render(<WhiteboardCanvas activeTool="pen" />);
    // The component effect should have run.
    expect(mockCanvasInstance.isDrawingMode).toBe(true);
  });

  it('sets isDrawingMode to false when activeTool is shape', () => {
    render(<WhiteboardCanvas activeTool="shape" />);
    expect(mockCanvasInstance.isDrawingMode).toBe(false);
  });

  it('calls onCursorMove callback on mouse:move event', () => {
    const onCursorMove = vi.fn();
    render(<WhiteboardCanvas onCursorMove={onCursorMove} />);

    // Check if on was called with 'mouse:move'
    // calls is an array of args: [event, handler]
    const mouseMoveCall = mockCanvasInstance.on.mock.calls.find(
      (call: any[]) => call[0] === 'mouse:move',
    );
    expect(mouseMoveCall).toBeDefined();

    // Simulate event
    const handler = mouseMoveCall![1];
    handler({ e: {} }); // Mock event object

    // Check if callback fired
    expect(mockCanvasInstance.getPointer).toHaveBeenCalled();
    expect(onCursorMove).toHaveBeenCalledWith(0, 0); // Mock getPointer returns 0,0
  });
});
