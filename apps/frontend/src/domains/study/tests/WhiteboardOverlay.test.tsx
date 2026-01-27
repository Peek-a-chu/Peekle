import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WhiteboardOverlay } from '../components/whiteboard/WhiteboardOverlay';
import { useRoomStore } from '../hooks/useRoomStore';

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
const mockSetWhiteboardOverlayOpen = vi.fn();
vi.mock('../hooks/useRoomStore', () => ({
  useRoomStore: (selector: any) =>
    selector({
      isWhiteboardOverlayOpen: true,
      setWhiteboardOverlayOpen: mockSetWhiteboardOverlayOpen,
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
    expect(screen.getByLabelText(/닫기/i)).toBeInTheDocument();
  });

  it('closes overlay when close button is clicked', () => {
    render(<WhiteboardOverlay />);

    const closeBtn = screen.getByLabelText(/닫기/i);
    fireEvent.click(closeBtn);
    expect(mockSetWhiteboardOverlayOpen).toHaveBeenCalledWith(false);
  });
});
