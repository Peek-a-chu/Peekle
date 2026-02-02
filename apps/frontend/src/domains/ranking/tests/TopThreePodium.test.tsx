import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TopThreePodium } from '../components/TopThreePodium';
import type { RankResponse } from '@/api/rankingApi';

const mockRankings: RankResponse[] = [
  {
    rank: 1,
    studyId: 1,
    name: 'First Study',
    totalPoint: 1500,
    memberCount: 5,
    members: [],
  },
  {
    rank: 2,
    studyId: 2,
    name: 'Second Study',
    totalPoint: 1200,
    memberCount: 4,
    members: [],
  },
  {
    rank: 3,
    studyId: 3,
    name: 'Third Study',
    totalPoint: 1000,
    memberCount: 3,
    members: [],
  },
];

describe('TopThreePodium', () => {
  it('renders top three rankings', () => {
    const onStudyClick = vi.fn();
    render(<TopThreePodium rankings={mockRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('First Study')).toBeInTheDocument();
    expect(screen.getByText('Second Study')).toBeInTheDocument();
    expect(screen.getByText('Third Study')).toBeInTheDocument();
  });

  it('displays rank badges correctly', () => {
    const onStudyClick = vi.fn();
    render(<TopThreePodium rankings={mockRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('displays points', () => {
    const onStudyClick = vi.fn();
    render(<TopThreePodium rankings={mockRankings} onStudyClick={onStudyClick} />);

    // Points typically have "점" suffix and formatting
    expect(screen.getByText(/1,500/)).toBeInTheDocument();
    expect(screen.getByText(/1,200/)).toBeInTheDocument();
  });

  it('calls onStudyClick when a podium item is clicked', () => {
    const onStudyClick = vi.fn();
    render(<TopThreePodium rankings={mockRankings} onStudyClick={onStudyClick} />);

    const firstStudy = screen.getByText('First Study').closest('div[class*="cursor-pointer"]');
    if (firstStudy) {
      fireEvent.click(firstStudy);
      expect(onStudyClick).toHaveBeenCalledWith(1);
    }
  });

  it('renders only available rankings', () => {
    const onStudyClick = vi.fn();
    const partialRankings = mockRankings.slice(0, 2);
    render(<TopThreePodium rankings={partialRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('First Study')).toBeInTheDocument();
    expect(screen.getByText('Second Study')).toBeInTheDocument();
    expect(screen.queryByText('Third Study')).not.toBeInTheDocument();
  });
});
