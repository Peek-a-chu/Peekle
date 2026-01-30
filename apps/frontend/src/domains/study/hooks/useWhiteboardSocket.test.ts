import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mutable mocked socket state so we can simulate connect/disconnect across rerenders.
let socketState: { client: any; connected: boolean } = { client: null, connected: false };

vi.mock('@/domains/study/context/SocketContext', () => ({
  useSocketContext: () => socketState,
}));

vi.mock('@/store/auth-store', () => ({
  useAuthStore: () => ({ user: { id: 777 } }),
}));

vi.mock('@/domains/study/store/study-store', () => ({
  useStudyStore: () => ({ studyId: null, setStudyId: vi.fn() }),
}));

vi.mock('./useRoomStore', () => ({
  useRoomStore: (selector?: any) => {
    const state = { setWhiteboardOverlayOpen: vi.fn() };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

import { useWhiteboardSocket } from './useWhiteboardSocket';

describe('useWhiteboardSocket outbound queue', () => {
  beforeEach(() => {
    socketState = { client: null, connected: false };
  });

  it('queues messages while disconnected and flushes when connected', () => {
    const publish = vi.fn();
    const subscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
    const client = { publish, subscribe };
    socketState.client = client;
    socketState.connected = false;

    const { result, rerender } = renderHook(() =>
      useWhiteboardSocket('1', '777', () => undefined, { enabled: true }),
    );

    act(() => {
      result.current.sendMessage({ action: 'ADDED', objectId: 'o1', data: { foo: 'bar' } });
    });

    expect(publish).toHaveBeenCalledTimes(0);

    socketState.connected = true;
    rerender();

    expect(subscribe).toHaveBeenCalled();
    // flush effect should publish the queued message
    expect(publish).toHaveBeenCalledTimes(1);
  });
});

