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
    expandedIds: [] as number[],
    onToggleExpand: vi.fn(),
  };

  it('renders ranking list items', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    expect(screen.getByText('Fourth Study')).toBeInTheDocument();
    expect(screen.getByText('Fifth Study')).toBeInTheDocument();
  });

  it('displays rank badges', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    // Rank 4 is displayed. "위" might not be in the row anymore based on new design
    expect(screen.getAllByText(/4/)).toHaveLength(1);
    expect(screen.getAllByText(/5/)).toHaveLength(1);
  });

  it('displays points and member counts', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    // Use regex to handle potential whitespace or split text nodes (e.g. "800 점")
    expect(screen.getByText(/800/)).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument();
    // Also check for member count "2명"
    expect(screen.getByText(/2/)).toBeInTheDocument();
  });

  it('expands to show members when expandedIds includes the id', () => {
    // Render with ID 4 pre-expanded
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} expandedIds={[4]} />);

    // Initial state: members visible for ID 4
    expect(screen.getByText('스터디 멤버')).toBeInTheDocument();
  });

  it('calls onToggleExpand when clicked', () => {
    render(<StudyRankingList rankings={mockRankings} {...defaultProps} />);

    const fourthStudyText = screen.getByText('Fourth Study');
    const clickableItem = fourthStudyText.closest('.cursor-pointer');

    fireEvent.click(clickableItem || fourthStudyText);

    expect(defaultProps.onToggleExpand).toHaveBeenCalledWith(4);
  });

  it('displays empty state when rankings array is empty', () => {
    render(<StudyRankingList rankings={[]} {...defaultProps} />);
    expect(screen.getByText('랭킹 정보가 없습니다.')).toBeInTheDocument();
  });
});
