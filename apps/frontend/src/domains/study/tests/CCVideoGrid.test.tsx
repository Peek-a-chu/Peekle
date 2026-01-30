import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCVideoGrid } from '../components/CCVideoGrid';

const mockViewRealtimeCode = vi.fn();
const mockResetToOnlyMine = vi.fn();

const mockState: any = {
  participants: [
    {
      id: 1,
      odUid: '1',
      nickname: 'Me',
      isOwner: false,
      isMuted: false,
      isVideoOff: true,
      isOnline: true,
    },
    {
      id: 2,
      odUid: '2',
      nickname: 'Other',
      isOwner: false,
      isMuted: false,
      isVideoOff: true,
      isOnline: true,
    },
  ],
  currentUserId: 1,
  selectedProblemId: null as number | null, // important: should still allow split selection
  isWhiteboardActive: false,
  viewRealtimeCode: mockViewRealtimeCode,
  resetToOnlyMine: mockResetToOnlyMine,
  viewingUser: null,
};

const mockUseRoomStore = (selector: any) => {
  if (typeof selector === 'function') {
    return selector(mockState);
  }
  return mockState;
};

mockUseRoomStore.getState = () => mockState;

vi.mock('../hooks/useRoomStore', () => ({
  useRoomStore: mockUseRoomStore,
}));

describe('CCVideoGrid', () => {
  it('allows selecting another participant when problem is selected (enters split view)', () => {
    // Set selectedProblemId to allow split view
    mockState.selectedProblemId = 1;
    
    render(<CCVideoGrid />);

    fireEvent.click(screen.getByText('Other'));
    expect(mockViewRealtimeCode).toHaveBeenCalledTimes(1);
    expect(mockViewRealtimeCode.mock.calls[0][0]).toMatchObject({ id: 2 });
    
    // Reset for other tests
    mockState.selectedProblemId = null;
  });
});

