'use client';

import { useRoomStore, type Participant as StoreParticipant } from '@/domains/study/hooks/useRoomStore';
import { CCVideoTile } from '@/domains/study/components/CCVideoTile';
import { CCWhiteboardTile as WhiteboardTile } from '@/domains/study/components/CCWhiteboardTile';
import { cn } from '@/lib/utils';
import { useParticipants } from '@livekit/components-react';
import { useMemo, useRef, type WheelEvent } from 'react';
import { toast } from 'sonner';
import { User } from 'lucide-react';

interface CCVideoGridProps {
  onWhiteboardClick?: () => void;
  className?: string;
}

export function CCVideoGrid({ onWhiteboardClick, className }: CCVideoGridProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const participants = useParticipants();
  const roomStoreParticipants = useRoomStore((state) => state.participants);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);
  // [Added] To control whiteboard split View from within Grid if needed, or rely on Parent
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const selectedProblemId = useRoomStore((state) => state.selectedProblemId);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    return 0;
  });

  const liveKitUserIds = useMemo(() => {
    const ids = new Set<number>();
    participants.forEach((p) => {
      // Identity format: "userId" or "userId_uuid"
      let userIdString = p.identity;
      if (p.identity.includes('_')) {
        userIdString = p.identity.split('_')[0];
      }
      const userId = Number(userIdString);
      if (!isNaN(userId)) {
        ids.add(userId);
      }
    });
    return ids;
  }, [participants]);

  // Ensure store online status reflects LiveKit presence (only promote to online, do not force offline)
  // Presence sync is handled globally by useStudyPresenceSync

  const storeById = useMemo(() => {
    const map = new Map<number, StoreParticipant>();
    roomStoreParticipants.forEach((p) => map.set(p.id, p));
    return map;
  }, [roomStoreParticipants]);

  const visibleLiveKitParticipants = useMemo(() => {
    return sortedParticipants.filter((p) => {
      if (p.isLocal) return true;
      let userIdString = p.identity;
      if (p.identity.includes('_')) {
        userIdString = p.identity.split('_')[0];
      }
      const userId = Number(userIdString);
      if (Number.isNaN(userId)) return false;
      return storeById.has(userId);
    });
  }, [sortedParticipants, storeById]);

  const offlineParticipants = roomStoreParticipants.filter((p) => {
    if (p.id === currentUserId) return false; // Me is handled by LiveKit (LocalParticipant) usually
    if (liveKitUserIds.has(p.id)) return false; // Already in LiveKit
    // Should we check p.isOnline? If they are offline in store, maybe don't show?
    // User requested "toast appears -> tile not added", implying they entered (online).
    // The ENTER event sets isOnline=true.
    return p.isOnline;
  });

  const handleTileClick = (identity: string) => {
    // When clicking a participant tile, we want to close whiteboard split view if open
    // to focus on code viewing (or self view)
    setWhiteboardOverlayOpen(false);

    // Identity format is now "userId_uuid" or just "userId" (legacy)
    // We need to parse it to get the userId for comparison
    let userIdString = identity;
    if (identity.includes('_')) {
      userIdString = identity.split('_')[0];
    }
    const userId = Number(userIdString);

    if (userId === currentUserId) {
      resetToOnlyMine();
    } else {
      if (!selectedProblemId) {
        toast.error('문제를 선택안하면 상대방 코드를 볼수없습니다.');
        return;
      }

      const p = roomStoreParticipants.find((p) => p.id === userId);
      if (p) {
        viewRealtimeCode(p);
      } else {
        console.warn('Participant not found in store:', userId);
      }
    }
  };

  const handleWheelScroll = (e: WheelEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

    e.preventDefault();
    scroller.scrollLeft += e.deltaY;
  };

  return (
    <div
      ref={scrollerRef}
      onWheel={handleWheelScroll}
      data-tour="video-grid"
      className={cn(
        'flex gap-2 overflow-x-auto overflow-y-hidden border-b border-border bg-card p-3 pb-2',
        className,
      )}
    >
      {isWhiteboardActive && selectedProblemTitle && <WhiteboardTile onClick={onWhiteboardClick} />}

      {visibleLiveKitParticipants.map((participant) => {
        let userIdString = participant.identity;
        if (participant.identity.includes('_')) {
          userIdString = participant.identity.split('_')[0];
        }
        const userId = Number(userIdString);
        const storeParticipant = Number.isNaN(userId) ? undefined : storeById.get(userId);
        return (
          <CCVideoTile
            key={participant.identity}
            participant={participant}
            isCurrentUser={participant.isLocal}
            displayName={storeParticipant?.nickname}
            onClick={() => handleTileClick(participant.identity)}
          />
        );
      })}

      {offlineParticipants.map((p) => (
        <CCOfflineTile
          key={`offline-${p.id}`}
          participant={p}
          isCurrentUser={p.id === currentUserId}
          onClick={() => handleTileClick(String(p.id))}
        />
      ))}

      {visibleLiveKitParticipants.length === 0 && offlineParticipants.length === 0 && (
        <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          참가자 대기 중...
        </div>
      )}
    </div>
  );
}

// Internal component for users not yet connected to LiveKit
function CCOfflineTile({
  participant,
  isCurrentUser,
  onClick,
  className,
}: {
  participant: StoreParticipant;
  isCurrentUser: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative h-full w-auto aspect-[4/3] shrink-0 overflow-hidden rounded-lg border border-border bg-muted',
        'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all',
        isCurrentUser && 'ring-2 ring-primary',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex h-full w-full items-center justify-center bg-gray-900 text-muted-foreground opacity-70">
        <User className="h-10 w-10" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="bg-black/40 px-2 py-1 rounded text-[10px] text-white/80">Connecting...</span>
      </div>

      <div className="absolute bottom-1 left-2 max-w-[80%]">
        <span className="truncate text-xs font-medium text-white shadow-sm drop-shadow-md">
          {participant.nickname} {isCurrentUser && '(나)'}
        </span>
      </div>
    </div>
  );
}
