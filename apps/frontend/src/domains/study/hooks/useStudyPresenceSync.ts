'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useParticipants } from '@livekit/components-react';
import { useRoomStore } from './useRoomStore';
import { fetchStudyParticipants } from '@/domains/study/api/studyApi';

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
  const updateParticipant = useRoomStore((state) => state.updateParticipant);
  const setParticipants = useRoomStore((state) => state.setParticipants);
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

  useEffect(() => {
    let shouldSync = false;
    const liveKitIdSet = new Set(liveKitPresence.map((presence) => presence.id));
    const liveKitById = new Map(
      liveKitPresence.map((presence) => [
        presence.id,
        { isMuted: presence.isMuted, isVideoOff: presence.isVideoOff },
      ]),
    );

    liveKitPresence.forEach((presence) => {
      // Skip local user - handled by MediaSync in CCStudyRoomClient
      if (currentUserId && presence.id === currentUserId) return;

      const existing = roomById.get(presence.id);
      if (!existing) {
        shouldSync = true;
        return;
      }
      const nextIsOnline = true;
      const nextIsMuted = presence.isMuted;
      const nextIsVideoOff = presence.isVideoOff;
      const needsUpdate =
        existing.isOnline !== nextIsOnline ||
        existing.isMuted !== nextIsMuted ||
        existing.isVideoOff !== nextIsVideoOff;
      if (needsUpdate) {
        updateParticipant(presence.id, {
          isOnline: nextIsOnline,
          isMuted: nextIsMuted,
          isVideoOff: nextIsVideoOff,
        });
      }
    });

    const now = Date.now();
    if (shouldSync && roomId && now - lastSyncRef.current > 2000) {
      lastSyncRef.current = now;
      fetchStudyParticipants(roomId)
        .then((members) => {
          const current = useRoomStore.getState().participants;
          const currentMap = new Map(current.map((p) => [p.id, p]));
          setParticipants(
            members.map((member) => {
              const id = Number(member.id);
              const existing = currentMap.get(id);
              const liveKitState = liveKitById.get(id);
              return {
                ...member,
                id,
                isOwner: member.isOwner ?? existing?.isOwner ?? false,
                isMuted: liveKitState?.isMuted ?? existing?.isMuted ?? member.isMuted ?? false,
                isVideoOff:
                  liveKitState?.isVideoOff ?? existing?.isVideoOff ?? member.isVideoOff ?? false,
                isOnline:
                  liveKitIdSet.has(id) ||
                  Boolean(existing?.isOnline) ||
                  Boolean(member.isOnline),
              };
            }),
          );
        })
        .catch((err) => console.error('Failed to sync participants from LiveKit:', err));
    }
  }, [liveKitPresence, roomById, updateParticipant, roomId, setParticipants, currentUserId]);
}
