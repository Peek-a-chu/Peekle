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
    it('sorts owner first, then online status, then alphabetically', () => {
      const mockState = {
        currentUserId: 1,
        participants: [
          { id: 2, nickname: 'Zebra', isOnline: true, isOwner: false },
          { id: 3, nickname: 'Apple', isOnline: true, isOwner: true }, // Owner
          { id: 1, nickname: 'Middle', isOnline: false, isOwner: false }, // Me, Offline
          { id: 4, nickname: 'Bear', isOnline: true, isOwner: false },
        ] as Participant[],
      } as RoomState & RoomActions;

      const sorted = selectSortedParticipants(mockState);

      expect(sorted[0].id).toBe(3); // Owner
      expect(sorted[1].id).toBe(4); // Online, 'Bear' < 'Zebra'
      expect(sorted[2].id).toBe(2); // Online, 'Zebra'
      expect(sorted[3].id).toBe(1); // Offline
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
