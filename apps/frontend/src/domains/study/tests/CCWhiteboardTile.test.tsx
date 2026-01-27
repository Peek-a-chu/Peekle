import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCWhiteboardTile } from '../components/CCWhiteboardTile';
import { useRoomStore } from '../hooks/useRoomStore';

// partial mock of useRoomStore
const mockSetWhiteboardOverlayOpen = vi.fn();

vi.mock('../hooks/useRoomStore', () => ({
  useRoomStore: (selector: any) => selector({
    isWhiteboardActive: true,
    whiteboardOpenedBy: 'Tester',
    setWhiteboardOverlayOpen: mockSetWhiteboardOverlayOpen,
  }),
}));

describe('CCWhiteboardTile', () => {
  it('calls setWhiteboardOverlayOpen(true) when clicked', () => {
    render(<CCWhiteboardTile />);
    
    const tile = screen.getByRole('button');
    fireEvent.click(tile);

    expect(mockSetWhiteboardOverlayOpen).toHaveBeenCalledWith(true);
  });
});
