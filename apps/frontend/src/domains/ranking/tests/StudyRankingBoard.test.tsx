import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CCStudyRankingBoard as StudyRankingBoard } from '../components/CCStudyRankingBoard';
import * as rankingApi from '@/api/rankingApi';

vi.mock('@/api/rankingApi');

const mockRankings = [
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
  {
    rank: 4,
    studyId: 4,
    name: 'Fourth Study',
    totalPoint: 800,
    memberCount: 2,
    members: [],
  },
];

describe('StudyRankingBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.spyOn(rankingApi, 'getRankings').mockImplementation(
      () =>
        new Promise(() => {
          // Never resolves to keep loading state
        }),
    );

    render(<StudyRankingBoard />);
    expect(screen.queryByText(/에러/i)).not.toBeInTheDocument();
  });

  it('renders rankings after loading', async () => {
    vi.spyOn(rankingApi, 'getRankings').mockResolvedValue({
      content: mockRankings,
      pageable: {
        pageNumber: 0,
        pageSize: 10,
      },
      totalElements: 4,
      totalPages: 1,
    });

    render(<StudyRankingBoard />);

    await waitFor(() => {
      expect(screen.getAllByText('First Study').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Second Study').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Third Study').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Fourth Study').length).toBeGreaterThan(0);
    });
  });

  it('displays error message on API failure', async () => {
    vi.spyOn(rankingApi, 'getRankings').mockRejectedValue(new Error('API Error'));

    render(<StudyRankingBoard />);

    await waitFor(() => {
      expect(screen.getByText(/에러/i)).toBeInTheDocument();
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('renders pagination when totalPages > 1', async () => {
    vi.spyOn(rankingApi, 'getRankings').mockResolvedValue({
      content: mockRankings,
      pageable: {
        pageNumber: 0,
        pageSize: 10,
      },
      totalElements: 20,
      totalPages: 2,
    });

    render(<StudyRankingBoard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument();
    });
  });
});
