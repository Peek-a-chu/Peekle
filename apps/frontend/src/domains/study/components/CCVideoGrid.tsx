'use client';

import { useRoomStore } from '@/domains/study/hooks/useRoomStore';
import { CCVideoTile } from '@/domains/study/components/CCVideoTile';
import { CCWhiteboardTile as WhiteboardTile } from '@/domains/study/components/CCWhiteboardTile';
import { cn } from '@/lib/utils';
import { useParticipants } from '@livekit/components-react';
import { toast } from 'sonner';

interface CCVideoGridProps {
  onWhiteboardClick?: () => void;
  className?: string;
}

export function CCVideoGrid({ onWhiteboardClick, className }: CCVideoGridProps) {
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const participants = useParticipants();
  const roomStoreParticipants = useRoomStore((state) => state.participants);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);
  // [Added] To control whiteboard split View from within Grid if needed, or rely on Parent
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    return 0;
  });

  const handleTileClick = (identity: string) => {
    // When clicking a participant tile, we want to close whiteboard split view if open
    // to focus on code viewing (or self view)
    setWhiteboardOverlayOpen(false);

    const userId = Number(identity); // Identity is userId string

    if (userId === currentUserId) {
      resetToOnlyMine();
    } else {
      const p = roomStoreParticipants.find((p) => p.id === userId);
      if (p) {
        viewRealtimeCode(p);
      } else {
        console.warn('Participant not found in store:', userId);
      }
    }
  };

  return (
    <div
      className={cn(
        'flex gap-2 overflow-x-auto border-b border-border bg-card p-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
    >
      {isWhiteboardActive && selectedProblemTitle && <WhiteboardTile onClick={onWhiteboardClick} />}

      {sortedParticipants.map((participant) => (
        <CCVideoTile
          key={participant.identity}
          participant={participant}
          isCurrentUser={participant.isLocal}
          onClick={() => handleTileClick(participant.identity)}
        />
      ))}

      {sortedParticipants.length === 0 && (
        <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          참가자 대기 중...
        </div>
      )}
    </div>
  );
}
