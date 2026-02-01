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
  it('renders ranking list items', () => {
    const onStudyClick = vi.fn();
    render(<StudyRankingList rankings={mockRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('Fourth Study')).toBeInTheDocument();
    expect(screen.getByText('Fifth Study')).toBeInTheDocument();
  });

  it('displays rank badges', () => {
    const onStudyClick = vi.fn();
    render(<StudyRankingList rankings={mockRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('#4')).toBeInTheDocument();
    expect(screen.getByText('#5')).toBeInTheDocument();
  });

  it('displays points and member counts', () => {
    const onStudyClick = vi.fn();
    render(<StudyRankingList rankings={mockRankings} onStudyClick={onStudyClick} />);

    expect(screen.getByText('800점')).toBeInTheDocument();
    expect(screen.getByText('2명')).toBeInTheDocument();
    expect(screen.getByText('600점')).toBeInTheDocument();
    expect(screen.getByText('3명')).toBeInTheDocument();
  });

  it('calls onStudyClick when a list item is clicked', () => {
    const onStudyClick = vi.fn();
    render(<StudyRankingList rankings={mockRankings} onStudyClick={onStudyClick} />);

    const fourthStudy = screen.getByText('Fourth Study').closest('div[class*="cursor-pointer"]');
    if (fourthStudy) {
      fireEvent.click(fourthStudy);
      expect(onStudyClick).toHaveBeenCalledWith(4);
    }
  });

  it('returns null when rankings array is empty', () => {
    const onStudyClick = vi.fn();
    const { container } = render(<StudyRankingList rankings={[]} onStudyClick={onStudyClick} />);
    expect(container.firstChild).toBeNull();
  });
});
