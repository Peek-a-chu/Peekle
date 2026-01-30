'use client';

import { useMemo } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCVideoTile as VideoTile } from '@/domains/study/components/CCVideoTile';
import { CCWhiteboardTile as WhiteboardTile } from '@/domains/study/components/CCWhiteboardTile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CCVideoGridProps {
  onWhiteboardClick?: () => void;
  className?: string;
}

export function CCVideoGrid({ onWhiteboardClick, className }: CCVideoGridProps) {
  const participants = useRoomStore((state) => state.participants);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      // Self always first
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;

      // Then by lastSpeakingAt (most recent first)
      const aTime = a.lastSpeakingAt ?? 0;
      const bTime = b.lastSpeakingAt ?? 0;
      return bTime - aTime;
    });
  }, [participants, currentUserId]);

  const handleTileClick = (participantId: number) => {
    // Check fresh state directly to avoid any closure staleness
    const { selectedProblemId, participants } = useRoomStore.getState();

    console.log('[VideoGrid] Tile clicked. State:', {
      selectedProblemId,
      participantId,
      currentUserId: useRoomStore.getState().currentUserId,
    });

    // If no problem is selected, clicking tiles does nothing (prevents split view)
    if (selectedProblemId === null || selectedProblemId === undefined) {
      toast.warning('문제를 먼저 선택해주세요.');
      return;
    }

    if (String(participantId) === String(currentUserId)) {
      // Clicking on self returns to "only mine" view
      console.log('[VideoGrid] Clicking self -> resetToOnlyMine');
      resetToOnlyMine();
    } else {
      // Clicking on others enters realtime code view
      console.log('[VideoGrid] Clicking other -> searching for', participantId);
      // Use fresh participants list or the one passed in props/memo
      // We use the one from store state to be safe for logic
      const participant = participants.find((p) => String(p.id) === String(participantId));

      if (participant) {
        console.log('[VideoGrid] Found participant, calling viewRealtimeCode', participant);
        viewRealtimeCode(participant);
      } else {
        console.warn('[VideoGrid] Participant not found for ID:', participantId);
        toast.error('참가자 정보를 찾을 수 없습니다.');
      }
    }
  };

  return (
    <div className={cn('flex gap-2 overflow-x-auto border-b border-border bg-card p-3', className)}>
      {/* Whiteboard Tile - Always first when active */}
      {isWhiteboardActive && <WhiteboardTile onClick={onWhiteboardClick} />}

      {/* Participant Tiles - Self first, then Active Speaker sorted */}
      {sortedParticipants.map((participant) => (
        <VideoTile
          key={participant.id}
          participant={participant}
          isCurrentUser={participant.id === currentUserId}
          onClick={() => handleTileClick(participant.id)}
        />
      ))}
    </div>
  );
}
