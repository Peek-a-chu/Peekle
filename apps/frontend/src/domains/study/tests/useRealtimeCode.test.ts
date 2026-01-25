import { renderHook, act } from '@testing-library/react';
import { useRealtimeCode } from '@/domains/study/hooks/useRealtimeCode';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('useRealtimeCode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return empty string when no user is viewed', () => {
    const { result } = renderHook(() => useRealtimeCode(null));
    expect(result.current).toBe('');
  });

  it('should return initial mock code for valid user', () => {
    const mockUser = {
      id: 2,
      nickname: 'Test',
      odUid: 'u2',
      isOwner: false,
      isMuted: false,
      isVideoOff: false,
      isOnline: true,
    };
    const { result } = renderHook(() => useRealtimeCode(mockUser));

    expect(result.current).toContain('import sys');
  });

  it('should update code over time', () => {
    const mockUser = {
      id: 2,
      nickname: 'Test',
      odUid: 'u2',
      isOwner: false,
      isMuted: false,
      isVideoOff: false,
      isOnline: true,
    };
    const { result } = renderHook(() => useRealtimeCode(mockUser));

    const initialCode = result.current;

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current).not.toBe(initialCode);
  });
});
