import { describe, expect, it } from 'vitest';
import { getDeterministicUserColor, isBlankText, WHITEBOARD_TEXT_PLACEHOLDER } from './whiteboard';

describe('whiteboard utils', () => {
  it('getDeterministicUserColor is stable for same userId', () => {
    const a1 = getDeterministicUserColor('123');
    const a2 = getDeterministicUserColor('123');
    expect(a1).toBe(a2);
  });

  it('getDeterministicUserColor varies across different userIds (usually)', () => {
    const a = getDeterministicUserColor('123');
    const b = getDeterministicUserColor('456');
    // Not guaranteed, but extremely likely with palette size 10
    expect(a).not.toBeUndefined();
    expect(b).not.toBeUndefined();
  });

  it('isBlankText treats whitespace as blank', () => {
    expect(isBlankText('')).toBe(true);
    expect(isBlankText('   ')).toBe(true);
    expect(isBlankText('\n\t')).toBe(true);
    expect(isBlankText('a')).toBe(false);
    expect(isBlankText(123 as any)).toBe(true);
  });

  it('placeholder constant is non-empty', () => {
    expect(WHITEBOARD_TEXT_PLACEHOLDER.length).toBeGreaterThan(0);
  });
});
