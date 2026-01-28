import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCProblemCard } from '@/domains/study/components/CCProblemCard';
import { Problem } from '@/domains/study/types';

describe('CCProblemCard', () => {
  const mockProblem = {
    problemId: 1001,
    title: 'Test Problem',
    tier: 'Bronze 5',
    solvedMemberCount: 2,
  };

  const defaultProps = {
    problem: mockProblem,
    isSelected: false,
    onSelect: vi.fn(),
    onOpenSubmission: vi.fn(),
  };

  it('renders problem title', () => {
    render(<CCProblemCard {...defaultProps} />);
    expect(screen.getByText(/1001/)).toBeInTheDocument();
    expect(screen.getByText(/Test Problem/)).toBeInTheDocument();
  });

  it('toggles hint visibility when hint button is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);
    // Tier should be hidden initially and shown when hint is toggled

    // Check tier not visible initially
    expect(screen.queryByText('Bronze 5')).not.toBeInTheDocument();

    // Click hint button to show tier
    const hintButton = screen.getByRole('button', { name: /toggle hint/i });
    fireEvent.click(hintButton);
    expect(screen.getByText('Bronze 5')).toBeInTheDocument();
  });

  it('calls onOpenSubmission when view icon is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);
    const viewButton = screen.getByRole('button', { name: /view submissions/i });
    fireEvent.click(viewButton);
    expect(defaultProps.onOpenSubmission).toHaveBeenCalledWith(mockProblem.problemId);
  });
});
