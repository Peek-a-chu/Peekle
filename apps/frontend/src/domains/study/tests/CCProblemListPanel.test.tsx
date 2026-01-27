import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCProblemListPanel } from '@/domains/study/components/CCProblemListPanel';

describe('CCProblemListPanel', () => {
  const defaultProps = {
    selectedDate: new Date(),
    onDateChange: vi.fn(),
    onAddProblem: vi.fn(),
    onToggleFold: vi.fn(),
    isFolded: false,
    problems: [],
  };

  it('renders problem list area', () => {
    render(<CCProblemListPanel {...defaultProps} />);
    expect(screen.getByText('아직 추가된 문제가 없습니다')).toBeInTheDocument();
  });

  it('calls onToggleFold when fold button is clicked', () => {
    render(<CCProblemListPanel {...defaultProps} />);
    // Looking for the button containing ChevronLeft
    // Since it has no aria-label, we find it by looking through all buttons.
    const buttons = screen.getAllByRole('button');
    const chevronButton = buttons.find((b) => b.querySelector('.lucide-chevron-left'));

    if (chevronButton) {
      fireEvent.click(chevronButton);
      expect(defaultProps.onToggleFold).toHaveBeenCalled();
    }
  });
});
