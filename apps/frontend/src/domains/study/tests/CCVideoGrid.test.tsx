import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCVideoGrid } from '../components/CCVideoGrid';

const mockViewRealtimeCode = vi.fn();
const mockResetToOnlyMine = vi.fn();

vi.mock('../hooks/useRoomStore', () => ({
  useRoomStore: (selector: any) =>
    selector({
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
      selectedProblemId: null, // important: should still allow split selection
      isWhiteboardActive: false,
      viewRealtimeCode: mockViewRealtimeCode,
      resetToOnlyMine: mockResetToOnlyMine,
      viewingUser: null,
    }),
}));

describe('CCVideoGrid', () => {
  it('allows selecting another participant even when no problem is selected (enters split view)', () => {
    render(<CCVideoGrid />);

    fireEvent.click(screen.getByText('Other'));
    expect(mockViewRealtimeCode).toHaveBeenCalledTimes(1);
    expect(mockViewRealtimeCode.mock.calls[0][0]).toMatchObject({ id: 2 });
  });
});

