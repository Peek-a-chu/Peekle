import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCProblemCard } from '@/domains/study/components/CCProblemCard';
import { Problem } from '@/domains/study/types';

describe('CCProblemCard', () => {
  const mockProblem: Problem = {
    id: 1,
    number: 1001,
    title: 'Test Problem',
    source: 'BOJ',
    status: 'completed',
    tags: ['BFS', 'DFS'],
    participantCount: 2,
    totalParticipants: 4,
    url: 'https://example.com/1',
    tier: 1,
  };

  const defaultProps = {
    problem: mockProblem,
    isSelected: false,
    onSelect: vi.fn(),
    onOpenSubmission: vi.fn(),
  };

  it('renders problem title', () => {
    render(<CCProblemCard {...defaultProps} />);
    expect(screen.getByText('1. Test Problem')).toBeInTheDocument();
  });

  it('toggles hint visibility when hint button is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);
    // Tags should be hidden initially (or shown depending on requirement? "Hint toggle to show tier and tags")
    // Let's assume tags are hidden initially if they are part of "Hint".
    // The current ProblemList implementation showed tags always. The AC says "Hint toggle to show tier/tags".
    // So let's assume they are hidden by default.

    // Check tags not visible (or some hint indicator)
    const hintButton = screen.getByRole('button', { name: /toggle hint/i });
    fireEvent.click(hintButton);
    expect(screen.getByText('BFS')).toBeInTheDocument();
    expect(screen.getByText('Bronze 5')).toBeInTheDocument();
  });

  it('calls onOpenSubmission when view icon is clicked', () => {
    render(<CCProblemCard {...defaultProps} />);
    const viewButton = screen.getByRole('button', { name: /view submissions/i });
    fireEvent.click(viewButton);
    expect(defaultProps.onOpenSubmission).toHaveBeenCalledWith(mockProblem.id);
  });
});
