import { describe, it, expect, beforeEach } from 'vitest';
import {
  selectSortedParticipants,
  Participant,
  RoomState,
  RoomActions,
  useRoomStore,
} from '@/domains/study/hooks/useRoomStore';
import { act } from '@testing-library/react';

describe('useRoomStore', () => {
  beforeEach(() => {
    act(() => {
      useRoomStore.getState().reset();
    });
  });

  describe('selectSortedParticipants', () => {
    it('sorts self first and others by recent speaking activity', () => {
      const mockState = {
        currentUserId: 1,
        participants: [
          { id: 2, lastSpeakingAt: 100 },
          { id: 3, lastSpeakingAt: 300 }, // Most recent speaker
          { id: 1 }, // Self
          { id: 4, lastSpeakingAt: 200 },
        ] as Participant[],
      } as RoomState & RoomActions;

      const sorted = selectSortedParticipants(mockState);

      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(3);
      expect(sorted[2].id).toBe(4);
      expect(sorted[3].id).toBe(2);
    });
  });

  describe('actions', () => {
    it('updates viewingUser and viewMode when viewing code', () => {
      const participant = { id: 2, nickname: 'Test', isOnline: true } as Participant;

      act(() => {
        useRoomStore.getState().viewRealtimeCode(participant);
      });

      expect(useRoomStore.getState().viewMode).toBe('SPLIT_REALTIME');
      expect(useRoomStore.getState().viewingUser).toEqual(participant);

      act(() => {
        useRoomStore.getState().resetToOnlyMine();
      });

      expect(useRoomStore.getState().viewMode).toBe('ONLY_MINE');
      expect(useRoomStore.getState().viewingUser).toBe(null);
    });
  });
});
