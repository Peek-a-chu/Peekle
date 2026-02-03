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

  it('shows menu button when viewer is owner and target is not me', () => {
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
    // Should show menu button (hasAnyAction = true because canOwnerActions || canViewCode || canViewProfile)
    const menuButton = screen.getByLabelText('메뉴');
    expect(menuButton).toBeDefined();

    // Check that menu button exists
    const buttons = screen.getAllByRole('button');
    // Menu button exists (may have opacity-0 but is in DOM)
    expect(buttons.length).toBeGreaterThanOrEqual(1);

    // If viewer is NOT owner but target is online and not me
    // hasAnyAction = canOwnerActions(false) || canViewCode(true) || canViewProfile(true) = true
    // So menu button should still exist
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
    // Menu button should still exist because canViewCode or canViewProfile is true
    const buttonsAfterRerender = screen.getAllByRole('button');
    expect(buttonsAfterRerender.length).toBeGreaterThanOrEqual(1);
  });
});
