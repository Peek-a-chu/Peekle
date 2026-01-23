import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCSubmissionViewerModal } from '@/domains/study/components/CCSubmissionViewerModal';
import { Submission } from '@/domains/study/types';

describe('CCSubmissionViewerModal', () => {
  const mockSubmissions: Submission[] = [
    {
      id: 1,
      userId: 101,
      username: 'CodeNinja',
      language: 'PYTHON 3',
      memory: 34200,
      time: 142,
      status: 'success',
      submittedAt: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      userId: 102,
      username: 'JavaKing',
      language: 'JAVA',
      memory: 68500,
      time: 256,
      status: 'success',
      submittedAt: '2023-01-01T00:00:00Z',
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    problemTitle: '1753. 최단경로',
    submissions: mockSubmissions,
    onViewCode: vi.fn(),
  };

  it('renders problem title', () => {
    render(<CCSubmissionViewerModal {...defaultProps} />);
    expect(screen.getByText(/1753. 최단경로/)).toBeInTheDocument();
  });

  it('renders submission list', () => {
    render(<CCSubmissionViewerModal {...defaultProps} />);
    expect(screen.getByText('CodeNinja')).toBeInTheDocument();
    expect(screen.getByText('JavaKing')).toBeInTheDocument();
  });

  it('filters submissions by username', () => {
    render(<CCSubmissionViewerModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/유저명으로 검색/i);
    fireEvent.change(searchInput, { target: { value: 'Java' } });

    expect(screen.queryByText('CodeNinja')).not.toBeInTheDocument();
    expect(screen.getByText('JavaKing')).toBeInTheDocument();
  });

  it('calls onViewCode when code check button is clicked', () => {
    render(<CCSubmissionViewerModal {...defaultProps} />);
    const checkButtons = screen.getAllByRole('button', { name: /코드 확인하기/i });
    fireEvent.click(checkButtons[0]);
    expect(defaultProps.onViewCode).toHaveBeenCalledWith(mockSubmissions[0].id);
  });

  it('calls onClose when close button is clicked', () => {
    render(<CCSubmissionViewerModal {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /닫기/i }); // Bottom close button or X button
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
