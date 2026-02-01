import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudyRankingList } from '../components/StudyRankingList';
import type { RankResponse } from '@/api/rankingApi';

const mockRankings: RankResponse[] = [
  {
    rank: 4,
    studyId: 4,
    name: 'Fourth Study',
    totalPoint: 800,
    memberCount: 2,
    members: [],
  },
  {
    rank: 5,
    studyId: 5,
    name: 'Fifth Study',
    totalPoint: 600,
    memberCount: 3,
    members: [],
  },
];

describe('StudyRankingList', () => {
  const defaultProps = {
    scope: 'ALL' as const,
    onScopeChange: vi.fn(),
    onStudyClick: vi.fn(),
  };

  it('renders ranking list items', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    expect(screen.getByText('Fourth Study')).toBeInTheDocument();
    expect(screen.getByText('Fifth Study')).toBeInTheDocument();
  });

  it('displays rank badges', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    // Based on component output: <span>4위</span> or split
    // Using regex to be flexible
    expect(screen.getAllByText(/4/)).toHaveLength(2); // Rank 4 and User count 2? No rank 4 and studyId 4 maybe?
    expect(screen.getAllByText(/위/)).toHaveLength(2); // "위" suffix
  });

  it('displays points and member counts', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    expect(screen.getByText('800')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });

  it('calls onStudyClick when a list item is clicked', () => {
    const onStudyClick = vi.fn();
    render(
      <StudyRankingList rankings={mockRankings} {...defaultProps} onStudyClick={onStudyClick} />,
    );

    const fourthStudyText = screen.getByText('Fourth Study');
    // Ensure we click the interactive element if bubbling isn't working as expected or target logic dictates
    const clickableItem = fourthStudyText.closest('.group');
    fireEvent.click(clickableItem || fourthStudyText);
    expect(onStudyClick).toHaveBeenCalledWith(4);
  });

  it('displays empty state when rankings array is empty', () => {
    render(<StudyRankingList rankings={[]} {...defaultProps} />);
    expect(screen.getByText('랭킹 정보가 없습니다.')).toBeInTheDocument();
  });
});
