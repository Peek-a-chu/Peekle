import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CCProblemListPanel } from '../components/CCProblemListPanel';

// Silence noisy logs from this component during test
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('CCProblemListPanel keys', () => {
  it('does not emit React key warning when problems contain duplicate/missing problemId', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CCProblemListPanel
        problems={[
          {
            problemId: 1,
            title: 'A',
            tier: 'B5',
            solvedMemberCount: 0,
            totalMemberCount: 4,
          },
          // duplicate id (should not cause key warning due to fallback key)
          {
            problemId: 1,
            title: 'A-dup',
            tier: 'B5',
            solvedMemberCount: 0,
            totalMemberCount: 4,
          },
          // @ts-expect-error simulate bad data
          { title: 'MissingId', tier: 'B5', solvedMemberCount: 0 },
        ]}
        selectedDate={new Date()}
        onDateChange={() => {}}
        onToggleFold={() => {}}
        isFolded={false}
      />,
    );

    const keyWarnings = errorSpy.mock.calls
      .map((c) => String(c[0] ?? ''))
      .filter((msg) => msg.includes('unique "key"'));
    expect(keyWarnings.length).toBe(0);
  });
});
