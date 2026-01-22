import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StudyHeader } from '@/domains/study/components';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { act } from 'react';

describe('StudyHeader', () => {
  const defaultProps = {
    selectedDate: new Date('2026-01-21'),
    onDateChange: vi.fn(),
  };

  beforeEach(() => {
    act(() => {
      useRoomStore.setState({
        roomTitle: 'Test Title',
        currentDate: '2026-01-21',
        currentUserId: 1,
        participants: [{ id: 1, isOwner: true } as any],
      });
    });
  });

  it('renders room info', () => {
    render(<StudyHeader {...defaultProps} />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    // CalendarWidget renders yy/MM/dd
    expect(screen.getByText('26/01/21')).toBeInTheDocument();
  });

  it('calls handlers', () => {
    const onBack = vi.fn();
    const onAddProblem = vi.fn();
    const onInvite = vi.fn();

    render(
      <StudyHeader
        {...defaultProps}
        onBack={onBack}
        onAddProblem={onAddProblem}
        onInvite={onInvite}
      />,
    );

    fireEvent.click(screen.getByLabelText('뒤로 가기'));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(screen.getByText('문제 추가'));
    expect(onAddProblem).toHaveBeenCalled();

    fireEvent.click(screen.getByText('초대하기'));
    expect(onInvite).toHaveBeenCalled();
  });

  it('shows settings only for owner', () => {
    // As owner (default in beforeEach)
    const onSettings = vi.fn();
    const { unmount } = render(<StudyHeader {...defaultProps} onSettings={onSettings} />);

    const btn = screen.getByText('스터디 설정');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onSettings).toHaveBeenCalled();

    unmount();

    // As non-owner
    act(() => {
      useRoomStore.setState({
        participants: [{ id: 1, isOwner: false } as any],
      });
    });

    render(<StudyHeader {...defaultProps} onSettings={onSettings} />);
    expect(screen.queryByText('스터디 설정')).not.toBeInTheDocument();
  });
});
