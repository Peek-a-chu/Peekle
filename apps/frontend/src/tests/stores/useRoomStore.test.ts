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

    it('patches participants without requiring a full replacement', () => {
      act(() => {
        useRoomStore.getState().setParticipants([
          {
            id: 1,
            nickname: 'Alice',
            isOwner: false,
            isMuted: false,
            isVideoOff: false,
            isOnline: false,
          },
        ]);
        useRoomStore.getState().patchParticipants([
          { id: 1, isOnline: true },
          { id: 2, nickname: 'Bob', isOnline: true },
        ]);
      });

      expect(useRoomStore.getState().participants).toEqual([
        {
          id: 1,
          nickname: 'Alice',
          isOwner: false,
          isMuted: false,
          isVideoOff: false,
          isOnline: true,
        },
        {
          id: 2,
          nickname: 'Bob',
          isOwner: false,
          isMuted: false,
          isVideoOff: false,
          isOnline: true,
          profileImage: undefined,
          lastSpeakingAt: undefined,
        },
      ]);
    });

    it('merges room snapshots while preserving ephemeral media state', () => {
      act(() => {
        useRoomStore.getState().setParticipants([
          {
            id: 1,
            nickname: 'Alice',
            isOwner: false,
            isMuted: true,
            isVideoOff: true,
            isOnline: true,
          },
          {
            id: 2,
            nickname: 'Bob',
            isOwner: true,
            isMuted: false,
            isVideoOff: false,
            isOnline: false,
          },
        ]);
        useRoomStore.getState().replaceParticipantsFromSnapshot([
          { id: 1, nickname: 'Alice', isOwner: true },
          { id: 3, nickname: 'Charlie', isOnline: true },
        ]);
      });

      expect(useRoomStore.getState().participants).toEqual([
        {
          id: 1,
          nickname: 'Alice',
          isOwner: true,
          isMuted: true,
          isVideoOff: true,
          isOnline: true,
          profileImage: undefined,
          lastSpeakingAt: undefined,
        },
        {
          id: 3,
          nickname: 'Charlie',
          isOwner: false,
          isMuted: false,
          isVideoOff: false,
          isOnline: true,
          profileImage: undefined,
          lastSpeakingAt: undefined,
        },
      ]);
    });

    it('syncs online users and creates placeholders for unseen participants', () => {
      act(() => {
        useRoomStore.getState().setParticipants([
          {
            id: 1,
            nickname: 'Alice',
            isOwner: false,
            isMuted: false,
            isVideoOff: false,
            isOnline: true,
          },
        ]);
        useRoomStore.getState().syncParticipantsOnline([2]);
      });

      expect(useRoomStore.getState().participants).toEqual([
        {
          id: 1,
          nickname: 'Alice',
          isOwner: false,
          isMuted: false,
          isVideoOff: false,
          isOnline: false,
        },
        {
          id: 2,
          nickname: 'User 2',
          isOwner: false,
          isMuted: false,
          isVideoOff: false,
          isOnline: true,
          profileImage: undefined,
          lastSpeakingAt: undefined,
        },
      ]);
    });
  });
});
