import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalSearchBar } from '@/components/search/GlobalSearchBar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// TODO: Re-enable when React 19 + Vitest compatibility is resolved
// Issue: "Invalid hook call" error in test environment
describe.skip('GlobalSearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', () => {
    render(<GlobalSearchBar />);
    expect(screen.getByPlaceholderText('문제, 사용자, 문제집 검색...')).toBeInTheDocument();
  });

  it('shows search icon', () => {
    render(<GlobalSearchBar />);
    const searchIcon = document.querySelector('svg');
    expect(searchIcon).toBeInTheDocument();
  });

  it('does not show suggestions for queries less than 2 characters', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.queryByText('검색 중...')).not.toBeInTheDocument();
    });
  });

  it('shows loading state while fetching suggestions', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'AB' } });
    vi.advanceTimersByTime(300);

    // Loading state should appear briefly
    await waitFor(() => {
      expect(screen.getByText('검색 중...')).toBeInTheDocument();
    });
  });

  it('debounces input with 300ms delay', async () => {
    const onSearch = vi.fn();
    render(<GlobalSearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'AB' } });
    vi.advanceTimersByTime(100);
    fireEvent.change(input, { target: { value: 'ABC' } });
    vi.advanceTimersByTime(100);

    // Should not fetch yet
    expect(screen.queryByText('검색 중...')).not.toBeInTheDocument();

    vi.advanceTimersByTime(300);

    // Now it should fetch
    await waitFor(() => {
      expect(screen.getByText('검색 중...')).toBeInTheDocument();
    });
  });

  it('displays suggestions after debounce', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('A+B')).toBeInTheDocument();
    });
  });

  it('shows clear button when query has value', () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'test' } });

    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();
  });

  it('clears input when clear button is clicked', () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'test' } });
    expect(input.value).toBe('test');

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    expect(input.value).toBe('');
  });

  it('supports keyboard navigation with ArrowDown', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('A+B')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // First suggestion should be highlighted
    const firstSuggestion = screen.getByText('A+B').closest('button');
    expect(firstSuggestion).toHaveClass('bg-[#E24EA0]/10');
  });

  it('supports keyboard navigation with ArrowUp', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('A+B')).toBeInTheDocument();
    });

    // Navigate down then up
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    // Should go back to -1 (no selection)
    const buttons = document.querySelectorAll('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveClass('bg-[#E24EA0]/10');
    });
  });

  it('closes dropdown on Escape key', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('A+B')).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByText('A+B')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <GlobalSearchBar />
        <div data-testid="outside">Outside element</div>
      </div>,
    );

    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('A+B')).toBeInTheDocument();
    });

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    expect(screen.queryByText('A+B')).not.toBeInTheDocument();
  });

  it('calls onSearch callback when Enter is pressed', () => {
    const onSearch = vi.fn();
    render(<GlobalSearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('does not call onSearch for queries less than 2 characters', () => {
    const onSearch = vi.fn();
    render(<GlobalSearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('displays suggestion type icons correctly', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('📝')).toBeInTheDocument(); // problem
      expect(screen.getByText('👤')).toBeInTheDocument(); // user
      expect(screen.getByText('📚')).toBeInTheDocument(); // workbook
    });
  });

  it('displays suggestion type labels correctly', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('문제')).toBeInTheDocument();
      expect(screen.getByText('사용자')).toBeInTheDocument();
      expect(screen.getByText('문제집')).toBeInTheDocument();
    });
  });

  it('displays tier information for problems', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'A+B' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText(/BRONZE_5/)).toBeInTheDocument();
    });
  });

  it('respects MAX_SUGGESTIONS_PER_CATEGORY limit', async () => {
    render(<GlobalSearchBar />);
    const input = screen.getByPlaceholderText('문제, 사용자, 문제집 검색...');

    fireEvent.change(input, { target: { value: 'test' } });
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      const suggestions = document.querySelectorAll('button');
      // Mock data returns 4 items, max is 5 per category * 3 categories = 15
      expect(suggestions.length).toBeLessThanOrEqual(15);
    });
  });
});
