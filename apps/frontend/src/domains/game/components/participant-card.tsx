import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Crown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import type { Participant } from '@/domains/game/types/game-types';
import { Button } from '@/components/ui/button';

interface ParticipantCardProps {
  participant?: Participant;
  isEmpty?: boolean;
  isHost?: boolean;
  onKick?: () => void;
  isSelf?: boolean;
  localStream?: MediaStream | null;
}

export function ParticipantCard({
  participant,
  isEmpty = false,
  isHost = false,
  onKick,
  isSelf = false,
  localStream,
}: ParticipantCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  if (isEmpty || !participant) {
    // 빈 슬롯: 라이트 모드(bg-muted/border-border), 다크 모드(bg-[#121A28]/border-white/20)
    return (
      <div className="flex h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted pt-2 transition-colors dark:border-white/20 dark:bg-[#121A28]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/50 dark:bg-black/20">
          <span className="text-lg opacity-50 dark:text-white/70 dark:opacity-100">👤</span>
        </div>
        <span className="mt-2 text-[10px] font-medium text-muted-foreground dark:text-white/60">
          빈 슬롯
        </span>
      </div>
    );
  }

  const isReady = participant.status === 'READY';
  const team = participant.team;

  const handleKickClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onKick?.();
  };

  return (
    <div
      className={cn(
        'group relative flex h-28 flex-col items-center justify-center rounded-xl border border-border bg-card pt-2 transition-all duration-200',
        'dark:border-white/10 dark:bg-[#1C2332] dark:hover:bg-[#243049]',
      )}
    >
      {/* 방장 왕관 아이콘 */}
      {participant.isHost && (
        <div className="absolute top-1.5 left-2">
          <Crown className="h-3.5 w-3.5 text-yellow-500 opacity-80 dark:text-white/75 dark:opacity-100" />
        </div>
      )}

      {/* Kick Button (Only for Host viewing other players) */}
      {isHost && !isSelf && (
        <div className="absolute top-1.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            onClick={handleKickClick}
            title="강퇴하기"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {localStream ? (
        <div className="h-10 w-10 overflow-hidden rounded-full ring-2 ring-primary dark:ring-primary/80">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover scale-x-[-1]"
          />
        </div>
      ) : (
        <UserIcon
          src={participant.profileImg}
          nickname={participant.nickname}
          size={40}
          className="border-none ring-2 ring-primary/10 dark:ring-white/5"
        />
      )}

      {/* 닉네임: 라이트(foreground), 다크(#E8EEF9) */}
      <span className="mt-2 text-xs font-bold tracking-tight text-foreground dark:text-[#E8EEF9]">
        {participant.nickname}
      </span>

      {/* 상태 표시: pill 배지 형태 */}
      <div className="mt-2">
        {participant.isHost ? (
          <div className="rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-600 dark:border-pink-500/35 dark:bg-pink-500/10 dark:text-[#FF6EC7]">
            방장
          </div>
        ) : isReady ? (
          <div className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-[#4ADE80]">
            준비 완료
          </div>
        ) : (
          <div className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            준비 대기
          </div>
        )}
      </div>

      {/* 팀 표시 (있는 경우 하단에 작게) */}
      {team && (
        <div
          className={cn(
            'absolute bottom-1 right-2 h-1.5 w-1.5 rounded-full',
            team === 'RED' ? 'bg-red-500' : 'bg-blue-500',
          )}
        />
      )}
    </div>
  );
}
