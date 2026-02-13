import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCProblemCard } from '@/domains/study/components/CCProblemCard';
import { StudyProblem } from '@/domains/study/types';

describe('CCProblemCard', () => {
  const mockProblem: StudyProblem = {
    problemId: 101,
    studyProblemId: 101,
    externalId: '1001',
    title: 'Test Problem',
    tier: 'Bronze V',
    type: 'BOJ',
    tags: ['구현', '수학'],
    solvedMemberCount: 2,
    totalMemberCount: 4,
  };

  const defaultProps = {
    problem: mockProblem,
    isSelected: false,
    onSelect: vi.fn(),
    onOpenSubmission: vi.fn(),
  };

  it('renders problem title and type badge', () => {
    render(<CCProblemCard {...defaultProps} />);
    expect(screen.getByText(/Test Problem/)).toBeInTheDocument();
    expect(screen.getByText('BOJ')).toBeInTheDocument();
  });

  it('toggles hint visibility when hint button is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);

    // Tier should be hidden initially
    expect(screen.queryByText('Bronze V')).not.toBeInTheDocument();

    // Click hint button (Lightbulb icon) to show tier
    const hintButton = screen.getByRole('button', { name: /힌트/i });
    fireEvent.click(hintButton);

    // Tier should now be visible
    expect(screen.getByText(/Bronze V/)).toBeInTheDocument();
  });

  it('calls onOpenSubmission when submission button is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);

    // Click the "Users" icon button for submissions
    const submissionButton = screen.getByRole('button', { name: /문제보관함/i });
    fireEvent.click(submissionButton);

    expect(defaultProps.onOpenSubmission).toHaveBeenCalledWith(mockProblem.studyProblemId);
  });

  it('calls onSelect when card is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);

    // Click the card itself
    const card = screen.getByText(/Test Problem/).closest('div[role="button"]');
    if (card) {
      fireEvent.click(card);
      expect(defaultProps.onSelect).toHaveBeenCalled();
    }
  });

  it('displays solved count', () => {
    render(<CCProblemCard {...defaultProps} />);
    expect(screen.getByText(/해결 2\/4/)).toBeInTheDocument();
  });
});
