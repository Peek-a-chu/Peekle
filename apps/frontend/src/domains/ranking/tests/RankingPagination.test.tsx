import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RankingPagination } from '../components/RankingPagination';

describe('RankingPagination', () => {
  it('calls onPageChange with correct page when page number is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />);

    const page2Button = screen.getByText('2');
    fireEvent.click(page2Button);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('calls onPageChange with next 10 pages logic when Next 10 button is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={20} onPageChange={onPageChange} />);

    const next10Button = screen.getByTitle('Next 10 Pages');
    fireEvent.click(next10Button);
    expect(onPageChange).toHaveBeenCalledWith(10);
  });

  it('calls onPageChange with previous 10 pages logic when Prev 10 button is clicked', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={15} totalPages={20} onPageChange={onPageChange} />);

    const prev10Button = screen.getByTitle('Previous 10 Pages');
    fireEvent.click(prev10Button);
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('disables buttons correctly at start', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={0} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByTitle('First Page')).toBeDisabled();
    expect(screen.getByTitle('Previous 10 Pages')).toBeDisabled();
    expect(screen.getByTitle('Next 10 Pages')).not.toBeDisabled();
    expect(screen.getByTitle('Last Page')).not.toBeDisabled();
  });

  it('disables buttons correctly at end', () => {
    const onPageChange = vi.fn();
    render(<RankingPagination currentPage={4} totalPages={5} onPageChange={onPageChange} />);

    expect(screen.getByTitle('First Page')).not.toBeDisabled();
    expect(screen.getByTitle('Previous 10 Pages')).not.toBeDisabled();
    expect(screen.getByTitle('Next 10 Pages')).toBeDisabled();
    expect(screen.getByTitle('Last Page')).toBeDisabled();
  });
});
