import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CCJoinStudyModal } from '@/domains/study/components/CCJoinStudyModal';
import { joinStudy } from '@/domains/study/api/studyApi';

vi.mock('@/domains/study/api/studyApi', () => ({
  joinStudy: vi.fn(),
}));

describe('CCJoinStudyModal', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal when open is true', () => {
    render(<CCJoinStudyModal {...defaultProps} />);
    expect(screen.getByText('스터디 참여하기')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('초대 코드를 입력하세요')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<CCJoinStudyModal {...defaultProps} open={false} />);
    expect(screen.queryByText('스터디 참여하기')).not.toBeInTheDocument();
  });

  it('calls joinStudy and onSuccess when valid code is submitted', async () => {
    const mockJoinStudy = vi.mocked(joinStudy);
    mockJoinStudy.mockResolvedValue({ id: 1, title: 'Test', role: 'MEMBER', members: [] });

    render(<CCJoinStudyModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('초대 코드를 입력하세요');
    fireEvent.change(input, { target: { value: 'ABC123' } });

    const submitButton = screen.getByText('참여하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockJoinStudy).toHaveBeenCalledWith('ABC123');
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(1);
    });
  });

  it('shows error when code is empty', async () => {
    render(<CCJoinStudyModal {...defaultProps} />);

    const submitButton = screen.getByText('참여하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('초대 코드를 입력해주세요')).toBeInTheDocument();
    });
  });

  it('handles join failure and shows error', async () => {
    const mockJoinStudy = vi.mocked(joinStudy);
    mockJoinStudy.mockRejectedValue(new Error('Invalid invite code'));

    render(<CCJoinStudyModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('초대 코드를 입력하세요');
    fireEvent.change(input, { target: { value: 'INVALID' } });

    const submitButton = screen.getByText('참여하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid invite code/)).toBeInTheDocument();
    });
  });

  it('closes modal when cancel is clicked', () => {
    render(<CCJoinStudyModal {...defaultProps} />);
    const cancelButton = screen.getByText('취소');
    fireEvent.click(cancelButton);
    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits on Enter key press', async () => {
    const mockJoinStudy = vi.mocked(joinStudy);
    mockJoinStudy.mockResolvedValue({ id: 1, title: 'Test', role: 'MEMBER', members: [] });

    render(<CCJoinStudyModal {...defaultProps} />);

    const input = screen.getByPlaceholderText('초대 코드를 입력하세요');
    fireEvent.change(input, { target: { value: 'ABC123' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockJoinStudy).toHaveBeenCalledWith('ABC123');
    });
  });
});
