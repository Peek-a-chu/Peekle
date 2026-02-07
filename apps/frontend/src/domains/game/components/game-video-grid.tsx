'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GamePlayParticipant } from '@/domains/game/types/game-types';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParticipants } from '@livekit/components-react';
import { GameVideoTile } from './GameVideoTile';
import { Participant } from 'livekit-client';

interface GameVideoGridProps {
  participants: GamePlayParticipant[];
  currentUserId: number;
  className?: string;
}

const PAGE_SIZE = 5;

export function GameVideoGrid({
  participants,
  currentUserId,
  className,
}: GameVideoGridProps) {
  const [page, setPage] = useState(0);

  // LiveKit participants (only available when inside LiveKitRoom context)
  const liveKitParticipants = useParticipants();

  // 현재 사용자를 앞에 배치
  const sortedParticipants = [...participants].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  const totalPages = Math.ceil(sortedParticipants.length / PAGE_SIZE);
  const displayedParticipants = sortedParticipants.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handlePrev = () => {
    setPage((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  };

  // Helper to find LiveKit participant by user ID (stored in metadata)
  const findLiveKitParticipant = (userId: number): Participant | undefined => {
    return liveKitParticipants.find((p) => {
      try {
        const metadata = JSON.parse(p.metadata || '{}');
        return metadata.userId === userId;
      } catch {
        return false;
      }
    });
  };

  return (
    <div className={cn('flex items-center border-b border-border bg-card px-2 py-3', className)}>
      {/* 이전 버튼 */}
      <div className="flex w-8 shrink-0 justify-center">
        {page > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* 비디오 그리드 */}
      <div className="flex flex-1 justify-center gap-2 overflow-hidden px-4">
        {displayedParticipants.map((participant) => {
          const lkParticipant = findLiveKitParticipant(participant.id);
          const isMe = participant.id === currentUserId;
          const isParticipantHost = participant.isHost;

          return (
            <div
              key={participant.id}
              className={cn(
                'relative',
                // 팀 배경색 및 테두리
                participant.team === 'RED' && !isMe && 'ring-1 ring-red-300',
                participant.team === 'BLUE' && !isMe && 'ring-1 ring-blue-300',
              )}
            >
              {lkParticipant ? (
                <GameVideoTile
                  participant={lkParticipant}
                  isCurrentUser={isMe}
                  className={cn(
                    participant.team === 'RED' && 'bg-red-50/30',
                    participant.team === 'BLUE' && 'bg-blue-50/30',
                  )}
                />
              ) : (
                // Fallback when LiveKit participant is not yet connected
                <div
                  className={cn(
                    'relative flex h-40 w-52 shrink-0 items-center justify-center overflow-hidden rounded-lg border transition-all',
                    'hover:ring-2 hover:ring-primary/50',
                    isMe ? 'border-2 border-primary ring-2 ring-primary' : 'border border-border',
                    participant.team === 'RED' && 'bg-red-50/30',
                    participant.team === 'BLUE' && 'bg-blue-50/30',
                    !participant.team && 'bg-muted/50',
                  )}
                >
                  <div className="flex h-full w-full items-center justify-center bg-gray-900 text-muted-foreground opacity-70">
                    <User className="h-10 w-10" />
                  </div>

                  {/* 닉네임 - 좌측 하단 */}
                  <div className="absolute bottom-1 left-2 max-w-[80%]">
                    <span className="truncate text-xs font-medium text-white shadow-sm drop-shadow-md">
                      {participant.nickname}
                    </span>
                  </div>
                </div>
              )}

              {/* 호스트 표시 (왕관만 표시) */}
              {isParticipantHost && (
                <div className="absolute top-1 right-1 z-10">
                  <div className="text-yellow-500 drop-shadow-sm" title="방장">
                    <div className="text-[10px]">👑</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 다음 버튼 */}
      <div className="flex w-8 shrink-0 justify-center">
        {page < totalPages - 1 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted"
            onClick={handleNext}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
