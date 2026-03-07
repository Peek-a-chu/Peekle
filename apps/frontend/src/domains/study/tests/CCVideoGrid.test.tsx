import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCVideoGrid } from '../components/CCVideoGrid';

vi.mock('@livekit/components-react', () => ({
  useParticipants: () => [
    { identity: '1', name: 'Me', isLocal: true, isMicrophoneEnabled: false },
    { identity: '2', name: 'Other', isLocal: false, isMicrophoneEnabled: false },
  ],
  useParticipantTracks: () => [],
  VideoTrack: () => <div data-testid="video-track" />,
}));

const { mockViewRealtimeCode, mockResetToOnlyMine, mockSetSelectedProblem, mockState } = vi.hoisted(() => {
  const mockViewRealtimeCode = vi.fn();
  const mockResetToOnlyMine = vi.fn();
  const mockSetSelectedProblem = vi.fn();

  const mockState: any = {
    roomId: 1,
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
    selectedStudyProblemId: null as number | null,
    selectedProblemTitle: null as string | null,
    isWhiteboardActive: false,
    viewRealtimeCode: mockViewRealtimeCode,
    resetToOnlyMine: mockResetToOnlyMine,
    setSelectedProblem: mockSetSelectedProblem,
    setWhiteboardOverlayOpen: vi.fn(),
    viewingUser: null,
  };

  return {
    mockViewRealtimeCode,
    mockResetToOnlyMine,
    mockSetSelectedProblem,
    mockState,
  };
});

const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api', () => ({
  apiFetch: mockApiFetch,
}));

vi.mock('../hooks/useRoomStore', () => {
  const mockUseRoomStore = (selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  };

  mockUseRoomStore.getState = () => mockState;

  return {
    useRoomStore: mockUseRoomStore,
  };
});

describe('CCVideoGrid', () => {
  it('allows selecting another participant when study problem is selected', async () => {
    mockState.selectedStudyProblemId = 1;

    render(<CCVideoGrid />);

    fireEvent.click(screen.getByText('Other'));

    await waitFor(() => {
      expect(mockViewRealtimeCode).toHaveBeenCalledTimes(1);
    });
    expect(mockViewRealtimeCode.mock.calls[0][0]).toMatchObject({ id: 2 });
    expect(mockApiFetch).not.toHaveBeenCalled();

    mockState.selectedStudyProblemId = null;
  });
});
