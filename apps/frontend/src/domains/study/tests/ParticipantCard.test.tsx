import { render, screen, fireEvent } from '@testing-library/react';
import { ParticipantCard } from '../components/ParticipantCard';
import { describe, it, expect, vi } from 'vitest';
import { Participant } from '../hooks/useRoomStore';

describe('ParticipantCard', () => {
  const mockParticipant: Participant = {
    id: 1,
    nickname: 'TestUser',
    isOnline: true,
    isOwner: false,
    isMuted: false,
    isVideoOff: false,
    odUid: '1',
  };

  it('renders nickname and online status', () => {
    render(
      <ParticipantCard
        participant={mockParticipant}
        isMe={false}
        isRoomOwner={false} // Viewer is not owner
        onKick={vi.fn()}
        onDelegate={vi.fn()}
        onViewCode={vi.fn()}
      />,
    );
    expect(screen.getByText('TestUser')).toBeDefined();
    // Online indicator title check
    expect(screen.getByTitle('온라인')).toBeDefined();
  });

  it('shows owner badge if participant is owner', () => {
    render(
      <ParticipantCard
        participant={{ ...mockParticipant, isOwner: true }}
        isMe={false}
        isRoomOwner={false}
        onKick={vi.fn()}
        onDelegate={vi.fn()}
        onViewCode={vi.fn()}
      />,
    );
    expect(screen.getByTitle('방장')).toBeDefined();
  });

  it('shows (나) if isMe is true', () => {
    render(
      <ParticipantCard
        participant={mockParticipant}
        isMe={true}
        isRoomOwner={false}
        onKick={vi.fn()}
        onDelegate={vi.fn()}
        onViewCode={vi.fn()}
      />,
    );
    expect(screen.getByText('(나)')).toBeDefined();
  });

  it('shows menu button ONLY if viewer is owner AND target is not me', () => {
    const { rerender } = render(
      <ParticipantCard
        participant={mockParticipant} // Target is normal user
        isMe={false}
        isRoomOwner={true} // Viewer is owner
        onKick={vi.fn()}
        onDelegate={vi.fn()}
        onViewCode={vi.fn()}
      />,
    );
    // Should show menu button (using lucide icon 'MoreVertical')
    // Since lucide renders SVG, we might look for button
    const buttons = screen.getAllByRole('button');
    // 1 for View Code, 1 for Menu
    expect(buttons.length).toBe(2);

    // If viewer is NOT owner
    rerender(
      <ParticipantCard
        participant={mockParticipant}
        isMe={false}
        isRoomOwner={false}
        onKick={vi.fn()}
        onDelegate={vi.fn()}
        onViewCode={vi.fn()}
      />,
    );
    // Menu button gone, only View Code remains
    expect(screen.getAllByRole('button').length).toBe(1);
  });
});
