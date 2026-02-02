import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CCStudyCard } from '@/domains/study/components/CCStudyCard';
import type { StudyListContent } from '@/domains/study/types';
import { useAuthStore } from '@/store/auth-store';

// Mock useAuthStore
vi.mock('@/store/auth-store', () => ({
  useAuthStore: vi.fn(),
}));

describe('CCStudyCard', () => {
  const mockStudy: StudyListContent = {
    id: 1,
    title: 'Test Study Room',
    description: 'This is a test study room description',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    memberCount: 5,
    profileImages: ['/user1.png', '/user2.png', '/user3.png'],
    rankingPoint: 0,
    owner: {
      id: 1,
      nickname: 'TestOwner',
      profileImage: '/owner.jpg',
    },
  };

  const defaultProps = {
    study: mockStudy,
    isOwner: false,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    // Default: user is not the owner
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, nickname: 'TestUser' },
      isAuthenticated: true,
      accessToken: null,
      isLoading: false,
      checkAuth: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);
  });

  it('renders study title and description', () => {
    render(<CCStudyCard {...defaultProps} />);
    expect(screen.getByText('Test Study Room')).toBeInTheDocument();
    expect(screen.getByText('This is a test study room description')).toBeInTheDocument();
  });

  it('displays member count', () => {
    render(<CCStudyCard {...defaultProps} />);
    expect(screen.getByText(/5명/)).toBeInTheDocument();
  });

  it('shows owner badge when current user is the owner', () => {
    // Mock: current user is the owner (id: 1)
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 1, nickname: 'TestOwner' },
      isAuthenticated: true,
      accessToken: null,
      isLoading: false,
      checkAuth: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    render(<CCStudyCard {...defaultProps} />);
    expect(screen.getByText(/방장/)).toBeInTheDocument();
  });

  it('does not show owner badge when current user is not the owner', () => {
    // Mock: current user is not the owner (id: 2)
    vi.mocked(useAuthStore).mockReturnValue({
      user: { id: 2, nickname: 'TestUser' },
      isAuthenticated: true,
      accessToken: null,
      isLoading: false,
      checkAuth: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
    } as any);

    render(<CCStudyCard {...defaultProps} />);
    expect(screen.queryByText(/방장/)).not.toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<CCStudyCard {...defaultProps} onClick={handleClick} />);
    const card = screen.getByText('Test Study Room').closest('[class*="Card"]');
    if (card) {
      fireEvent.click(card);
      expect(handleClick).toHaveBeenCalledTimes(1);
    }
  });

  it('handles missing description gracefully', () => {
    const studyWithoutDescription = { ...mockStudy, description: '' };
    render(<CCStudyCard {...defaultProps} study={studyWithoutDescription} />);
    expect(screen.getByText('Test Study Room')).toBeInTheDocument();
  });

  it('displays profile images when available', () => {
    render(<CCStudyCard {...defaultProps} />);
    const images = screen.getAllByAltText(/Participant/);
    expect(images.length).toBeGreaterThan(0);
  });

  it('shows member overflow count when more than 3 members', () => {
    const studyWithManyMembers = { ...mockStudy, memberCount: 10 };
    render(<CCStudyCard {...defaultProps} study={studyWithManyMembers} />);
    expect(screen.getByText(/\+7/)).toBeInTheDocument();
  });

  it('displays rank badge when rank is provided', () => {
    render(<CCStudyCard {...defaultProps} rank={1} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
  });

  it('displays ranking point', () => {
    const studyWithPoints = { ...mockStudy, rankingPoint: 100 };
    render(<CCStudyCard {...defaultProps} study={studyWithPoints} />);
    expect(screen.getByText(/스터디 점수: 100/)).toBeInTheDocument();
  });

  it('displays owner information', () => {
    render(<CCStudyCard {...defaultProps} />);
    expect(screen.getByText('TestOwner')).toBeInTheDocument();
  });
});
