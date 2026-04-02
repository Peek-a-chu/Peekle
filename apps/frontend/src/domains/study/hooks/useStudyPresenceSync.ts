'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useRoomStore } from './useRoomStore';
import { refreshStudyRoomSnapshot } from '@/domains/study/api/studyApi';
import { mapStudyRoomToParticipantPatches } from '@/domains/study/utils/participantSync';

interface LiveKitPresence {
  id: number;
  isMuted: boolean;
  isVideoOff: boolean;
}

function parseIdentity(identity: string): number | null {
  const userIdString = identity.includes('_') ? identity.split('_')[0] : identity;
  const userId = Number(userIdString);
  return Number.isNaN(userId) ? null : userId;
}

export function useStudyPresenceSync() {
  const liveKitParticipants = useParticipants();
  const roomId = useRoomStore((state) => state.roomId);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const roomParticipants = useRoomStore((state) => state.participants);
  const patchParticipants = useRoomStore((state) => state.patchParticipants);
  const replaceParticipantsFromSnapshot = useRoomStore(
    (state) => state.replaceParticipantsFromSnapshot,
  );
  const lastSyncRef = useRef(0);

  const liveKitPresence = useMemo<LiveKitPresence[]>(() => {
    return liveKitParticipants
      .map((p) => {
        const id = parseIdentity(p.identity);
        if (id === null) return null;
        return {
          id,
          isMuted: !p.isMicrophoneEnabled,
          isVideoOff: !p.isCameraEnabled,
        };
      })
      .filter((value): value is LiveKitPresence => value !== null);
  }, [liveKitParticipants]);

  const roomById = useMemo(() => {
    const map = new Map<number, (typeof roomParticipants)[number]>();
    roomParticipants.forEach((participant) => map.set(participant.id, participant));
    return map;
  }, [roomParticipants]);

  const refreshParticipantsFromRoom = useCallback(() => {
    if (!roomId) {
      return Promise.resolve();
    }

    return refreshStudyRoomSnapshot(roomId).then((room) => {
      replaceParticipantsFromSnapshot(mapStudyRoomToParticipantPatches(room), {
        replaceMissing: false,
      });
    });
  }, [roomId, replaceParticipantsFromSnapshot]);

  useEffect(() => {
    let shouldRefreshSnapshot = false;
    const participantPatches: Array<{
      id: number;
      isOnline: boolean;
      isMuted: boolean;
      isVideoOff: boolean;
    }> = [];

    liveKitPresence.forEach((presence) => {
      // Skip local user - handled by MediaSync in CCStudyRoomClient
      if (currentUserId && presence.id === currentUserId) return;

      const existing = roomById.get(presence.id);
      const nextIsOnline = true;
      const nextIsMuted = presence.isMuted;
      const nextIsVideoOff = presence.isVideoOff;
      const needsUpdate =
        !existing ||
        existing.isOnline !== nextIsOnline ||
        existing.isMuted !== nextIsMuted ||
        existing.isVideoOff !== nextIsVideoOff;

      if (needsUpdate) {
        participantPatches.push({
          id: presence.id,
          isOnline: nextIsOnline,
          isMuted: nextIsMuted,
          isVideoOff: nextIsVideoOff,
        });
      }

      if (!existing) {
        shouldRefreshSnapshot = true;
      }
    });

    if (participantPatches.length > 0) {
      patchParticipants(participantPatches);
    }

    const now = Date.now();
    if (shouldRefreshSnapshot && roomId && now - lastSyncRef.current > 2000) {
      lastSyncRef.current = now;
      refreshParticipantsFromRoom().catch((err) =>
        console.error('Failed to sync participants from LiveKit:', err),
      );
    }
  }, [
    liveKitPresence,
    roomById,
    patchParticipants,
    refreshParticipantsFromRoom,
    roomId,
    currentUserId,
  ]);
}
