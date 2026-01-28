import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WhiteboardOverlay } from '../components/whiteboard/WhiteboardOverlay';

// Mock dependencies
vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '123' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

// Mock custom hooks
vi.mock('../hooks/useWhiteboardSocket', () => ({
  useWhiteboardSocket: () => ({
    sendMessage: vi.fn(),
    isConnected: true,
  }),
}));

// Mock store
vi.mock('../hooks/useRoomStore', () => ({
  useRoomStore: (selector: (state: unknown) => unknown) =>
    selector({
      isWhiteboardOverlayOpen: true,
      setWhiteboardOverlayOpen: vi.fn(),
      selectedProblemId: null,
      selectedProblemTitle: null,
      currentUserId: 1,
    }),
}));

// Mock WhiteboardCanvas
vi.mock('../components/whiteboard/WhiteboardCanvas', () => ({
  WhiteboardCanvas: () => <div data-testid="mock-whiteboard-canvas">Canvas</div>,
}));

describe('WhiteboardOverlay', () => {
  it('renders toolbar and canvas when open', () => {
    render(<WhiteboardOverlay />);

    expect(screen.getByTestId('mock-whiteboard-canvas')).toBeInTheDocument();
    // Check for tool buttons (using aria-label or text)
    expect(screen.getByLabelText(/펜/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/도형/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/텍스트/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/지우개/i)).toBeInTheDocument();
  });

  it('renders all drawing tools in toolbar', () => {
    render(<WhiteboardOverlay />);

    // Verify all tool buttons exist and are clickable
    const penButton = screen.getByLabelText(/펜/i);
    const shapeButton = screen.getByLabelText(/도형/i);
    const textButton = screen.getByLabelText(/텍스트/i);
    const eraserButton = screen.getByLabelText(/지우개/i);

    expect(penButton).toBeInTheDocument();
    expect(shapeButton).toBeInTheDocument();
    expect(textButton).toBeInTheDocument();
    expect(eraserButton).toBeInTheDocument();
  });
});
