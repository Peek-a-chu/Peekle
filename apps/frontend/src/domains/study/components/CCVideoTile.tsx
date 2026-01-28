'use client';

import Image from 'next/image';
import { useRoomStore, type Participant } from '@/domains/study/hooks/useRoomStore';
import { cn } from '@/lib/utils';
import { Crown, Mic, MicOff, VideoOff, User } from 'lucide-react';

interface CCVideoTileProps {
  participant: Participant;
  isCurrentUser?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CCVideoTile({
  participant,
  isCurrentUser = false,
  onClick,
  className,
}: CCVideoTileProps) {
  const viewingUser = useRoomStore((state) => state.viewingUser);
  const isBeingViewed = viewingUser?.id === participant.id;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick?.();
        }
      }}
      className={cn(
        'relative flex h-24 w-32 shrink-0 cursor-pointer flex-col overflow-hidden rounded-lg bg-muted transition-all hover:ring-2 hover:ring-primary/50',
        isBeingViewed && 'ring-2 ring-yellow-400',
        !participant.isOnline && 'opacity-60',
        className,
      )}
    >
      {/* Video Area */}
      <div className="flex flex-1 items-center justify-center bg-muted-foreground/10">
        {participant.isVideoOff ? (
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-muted-foreground/20">
            {participant.profileImage ? (
              <Image
                src={participant.profileImage}
                alt={participant.nickname}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6 text-muted-foreground" />
            )}
          </div>
        ) : (
          // Video stream placeholder - will be replaced with actual video
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
            <User className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}

        {/* Video Off Indicator */}
        {participant.isVideoOff && (
          <div className="absolute right-1 top-1">
            <VideoOff className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="flex items-center justify-between bg-card/90 px-2 py-1">
        <div className="flex items-center gap-1 truncate">
          <span className="truncate text-xs font-medium">{participant.nickname}</span>
          {isCurrentUser && <span className="text-xs text-muted-foreground">(나)</span>}
        </div>

        <div className="flex items-center gap-1">
          {participant.isOwner && <Crown className="h-3 w-3 text-yellow-500" aria-label="방장" />}
          {participant.isMuted ? (
            <MicOff className="h-3 w-3 text-destructive" aria-label="음소거" />
          ) : (
            <Mic className="h-3 w-3 text-muted-foreground" aria-label="마이크 켜짐" />
          )}
        </div>
      </div>

      {/* Online Status Indicator */}
      <div
        className={cn(
          'absolute left-1 top-1 h-2 w-2 rounded-full',
          participant.isOnline ? 'bg-green-500' : 'bg-gray-400',
        )}
        aria-label={participant.isOnline ? '온라인' : '오프라인'}
      />
    </div>
  );
}
