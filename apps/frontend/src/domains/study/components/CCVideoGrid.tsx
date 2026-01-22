'use client';

import { useMemo } from 'react';
import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCVideoTile as VideoTile } from '@/domains/study/components/CCVideoTile';
import { CCWhiteboardTile as WhiteboardTile } from '@/domains/study/components/CCWhiteboardTile';
import { cn } from '@/lib/utils';

interface CCVideoGridProps {
  onWhiteboardClick?: () => void;
  className?: string;
}

export function CCVideoGrid({ onWhiteboardClick, className }: CCVideoGridProps) {
  const participants = useRoomStore((state) => state.participants);
  const currentUserId = useRoomStore((state) => state.currentUserId);
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
    if (participantId === currentUserId) {
      // Clicking on self returns to "only mine" view
      resetToOnlyMine();
    } else {
      // Clicking on others enters realtime code view
      const participant = sortedParticipants.find((p) => p.id === participantId);
      if (participant) {
        viewRealtimeCode(participant);
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
