import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RankingPagination } from '../components/RankingPagination';

describe('RankingPagination', () => {
  it('renders page numbers', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('highlights current page', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    const page3Button = screen.getByText('3');
    expect(page3Button).toHaveClass('bg-primary');
  });

  it('calls onPageChange when page number is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />);

    const page2Button = screen.getByText('2');
    fireEvent.click(page2Button);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('disables previous button on first page', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByText('이전');
    expect(prevButton.closest('button')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={4} totalPages={5} onPageChange={onPageChange} />);

    const nextButton = screen.getByText('다음');
    expect(nextButton.closest('button')).toBeDisabled();
  });

  it('calls onPageChange with previous page when previous button is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByText('이전');
    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next page when next button is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={2} totalPages={5} onPageChange={onPageChange} />);

    const nextButton = screen.getByText('다음');
    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows ellipsis for large page counts', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={5} totalPages={10} onPageChange={onPageChange} />);

    // Should show first page, ellipsis, current pages, ellipsis, last page
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
