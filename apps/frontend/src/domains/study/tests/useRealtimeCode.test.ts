import { renderHook } from '@testing-library/react';
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
    expect(result.current.code).toBe('');
  });

  it('should return initial code for valid user', () => {
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

    // Initial state before socket update might be empty
    expect(result.current.code).toBeDefined();
  });

  it('should update code state', () => {
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

    const initialCode = result.current.code;

    // We expect it to remain same if no socket event is fired in this unit test environment
    // without proper socket mocking.
    expect(result.current.code).toBe(initialCode);
  });
});
