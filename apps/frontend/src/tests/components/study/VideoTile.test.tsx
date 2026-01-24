import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoTile } from '@/domains/study/components';
import { Participant, useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { act } from 'react';

const mockParticipant: Participant = {
  id: 1,
  odUid: 'u1',
  nickname: 'TestUser',
  isOwner: false,
  isMuted: false,
  isVideoOff: false,
  isOnline: true,
};

describe('VideoTile', () => {
  beforeEach(() => {
    act(() => useRoomStore.setState({ viewingUser: null }));
  });

  it('renders nickname', () => {
    render(<VideoTile participant={mockParticipant} />);
    expect(screen.getByText('TestUser')).toBeInTheDocument();
  });

  it('shows crown for owner', () => {
    render(<VideoTile participant={{ ...mockParticipant, isOwner: true }} />);
    expect(screen.getByLabelText('방장')).toBeInTheDocument();
  });

  it('shows mute icon when muted', () => {
    render(<VideoTile participant={{ ...mockParticipant, isMuted: true }} />);
    expect(screen.getByLabelText('음소거')).toBeInTheDocument();
  });

  it('shows mic icon when not muted', () => {
    render(<VideoTile participant={{ ...mockParticipant, isMuted: false }} />);
    expect(screen.getByLabelText('마이크 켜짐')).toBeInTheDocument();
  });

  it('handles click', () => {
    const handleClick = vi.fn();
    render(<VideoTile participant={mockParticipant} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('applies yellow ring when being viewed', () => {
    act(() => useRoomStore.setState({ viewingUser: mockParticipant }));

    render(<VideoTile participant={mockParticipant} />);
    const tile = screen.getByRole('button');
    expect(tile.className).toContain('ring-yellow-400');
  });
});
