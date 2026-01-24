import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudyLayout } from '@/domains/study/components';

describe('StudyLayout', () => {
  it('renders all layout areas correctly', () => {
    render(
      <StudyLayout
        header={<div data-testid="header">Header</div>}
        leftPanel={<div data-testid="left">Left</div>}
        centerPanel={<div data-testid="center">Center</div>}
        rightPanel={<div data-testid="right">Right</div>}
        isLeftPanelFolded={false}
        onUnfoldLeftPanel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('center')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();

    // Check semantic roles
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('hides left panel when folded', () => {
    render(
      <StudyLayout
        header={<div>Header</div>}
        leftPanel={<div data-testid="left">Left</div>}
        centerPanel={<div>Center</div>}
        rightPanel={<div>Right</div>}
        isLeftPanelFolded={true}
        onUnfoldLeftPanel={vi.fn()}
      />,
    );

    // Since it's CSS hidden (w-0), the element still exists but with w-0 class
    const aside = screen.getByTestId('left').closest('aside');
    expect(aside).toHaveClass('w-0');
  });
});
