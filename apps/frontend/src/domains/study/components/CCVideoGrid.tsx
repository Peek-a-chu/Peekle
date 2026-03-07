'use client';

import { useRoomStore, type Participant as StoreParticipant } from '@/domains/study/hooks/useRoomStore';
import { CCVideoTile } from '@/domains/study/components/CCVideoTile';
import { CCWhiteboardTile as WhiteboardTile } from '@/domains/study/components/CCWhiteboardTile';
import { cn } from '@/lib/utils';
import { apiFetch } from '@/lib/api';
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
  const roomId = useRoomStore((state) => state.roomId);
  const isWhiteboardActive = useRoomStore((state) => state.isWhiteboardActive);
  const participants = useParticipants();
  const roomStoreParticipants = useRoomStore((state) => state.participants);
  const currentUserId = useRoomStore((state) => state.currentUserId);
  const viewRealtimeCode = useRoomStore((state) => state.viewRealtimeCode);
  const resetToOnlyMine = useRoomStore((state) => state.resetToOnlyMine);
  const setSelectedProblem = useRoomStore((state) => state.setSelectedProblem);
  const setWhiteboardOverlayOpen = useRoomStore((state) => state.setWhiteboardOverlayOpen);
  const selectedProblemTitle = useRoomStore((state) => state.selectedProblemTitle);
  const selectedStudyProblemId = useRoomStore((state) => state.selectedStudyProblemId);

  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.isLocal) return -1;
    if (b.isLocal) return 1;
    return 0;
  });

  const liveKitUserIds = useMemo(() => {
    const ids = new Set<number>();
    participants.forEach((p) => {
      let userIdString = p.identity;
      if (p.identity.includes('_')) {
        userIdString = p.identity.split('_')[0];
      }
      const userId = Number(userIdString);
      if (!Number.isNaN(userId)) {
        ids.add(userId);
      }
    });
    return ids;
  }, [participants]);

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
    if (p.id === currentUserId) return false;
    if (liveKitUserIds.has(p.id)) return false;
    return p.isOnline;
  });

  const selectTargetProblemIfNeeded = async (targetUserId: number): Promise<boolean> => {
    if (selectedStudyProblemId) return true;

    if (!roomId) {
      toast.error('\uC2A4\uD130\uB514 \uC815\uBCF4\uAC00 \uC5C6\uC5B4 \uBB38\uC81C\uB97C \uC120\uD0DD\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
      return false;
    }

    try {
      const response = await apiFetch<{
        studyProblemId?: number;
        problemTitle?: string;
        externalId?: string;
      }>(
        `/api/studies/${roomId}/ide/active-problem/${targetUserId}`,
      );
      const studyProblemId = Number(response.data?.studyProblemId);
      const problemTitle = (response.data?.problemTitle || '').trim();
      const externalId = (response.data?.externalId || '').trim();

      if (!response.success || !Number.isFinite(studyProblemId) || studyProblemId <= 0) {
        toast.error('\uC0C1\uB300\uBC29\uC774 \uD604\uC7AC \uD478\uB294 \uBB38\uC81C\uAC00 \uC5C6\uC5B4 \uCF54\uB4DC\uB97C \uBCFC \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.');
        return false;
      }

      setSelectedProblem(
        studyProblemId,
        studyProblemId,
        problemTitle.length > 0 ? problemTitle : 'Problem',
        externalId.length > 0 ? externalId : null,
      );
      return true;
    } catch {
      toast.error('\uC0C1\uB300\uBC29 \uBB38\uC81C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
      return false;
    }
  };

  const handleTileClick = async (identity: string) => {
    setWhiteboardOverlayOpen(false);

    let userIdString = identity;
    if (identity.includes('_')) {
      userIdString = identity.split('_')[0];
    }
    const userId = Number(userIdString);

    if (userId === currentUserId) {
      resetToOnlyMine();
      return;
    }

    const isProblemReady = await selectTargetProblemIfNeeded(userId);
    if (!isProblemReady) {
      return;
    }

    const participant = roomStoreParticipants.find((p) => p.id === userId);
    if (participant) {
      viewRealtimeCode(participant);
    } else {
      console.warn('Participant not found in store:', userId);
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
            onClick={() => void handleTileClick(participant.identity)}
          />
        );
      })}

      {offlineParticipants.map((p) => (
        <CCOfflineTile
          key={`offline-${p.id}`}
          participant={p}
          isCurrentUser={p.id === currentUserId}
          onClick={() => void handleTileClick(String(p.id))}
        />
      ))}

      {visibleLiveKitParticipants.length === 0 && offlineParticipants.length === 0 && (
        <div className="flex h-32 w-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
          {'\uCC38\uAC00\uC790 \uB300\uAE30 \uC911..'}
        </div>
      )}
    </div>
  );
}

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
          {participant.nickname} {isCurrentUser && '(\uB098)'}
        </span>
      </div>
    </div>
  );
}
