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

  it('renders fixed title', () => {
    render(<CCProblemListPanel {...defaultProps} />);
    expect(screen.getByText('문제 목록')).toBeInTheDocument();
  });

  it('calls onToggleFold when fold button is clicked', () => {
    render(<CCProblemListPanel {...defaultProps} />);
    const foldButton = screen.getByTitle('접기');
    fireEvent.click(foldButton);
    expect(defaultProps.onToggleFold).toHaveBeenCalled();
  });
});
