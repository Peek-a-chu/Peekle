'use client';

import Image from 'next/image';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserIcon } from '@/components/UserIcon';
import type { Participant } from '@/domains/game/types/game-types';

interface ParticipantCardProps {
  participant?: Participant;
  isEmpty?: boolean;
}

export function ParticipantCard({ participant, isEmpty = false }: ParticipantCardProps) {
  if (isEmpty || !participant) {
    // 빈 슬롯
    return (
      <div className="flex h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted pt-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
          <span className="text-lg text-muted-foreground">👤</span>
        </div>
        <span className="mt-1 text-xs text-muted-foreground">빈 슬롯</span>
      </div>
    );
  }

  const isReady = participant.status === 'READY';
  const team = participant.team;

  // 팀별 테두리 색상 (준비 상태에 따라 진하기 조절)
  const getBorderClass = () => {
    // 방장은 항상 준비된 상태와 동일한 진한 테두리 표시
    const isVisualReady = isReady || participant.isHost;

    if (team === 'RED') {
      return isVisualReady ? 'border-red-500 bg-red-50/50' : 'border-red-200/40 bg-red-50/10'; // 대기 상태: 아주 연하게
    }
    if (team === 'BLUE') {
      return isVisualReady ? 'border-blue-500 bg-blue-50/50' : 'border-blue-200/40 bg-blue-50/10'; // 대기 상태: 아주 연하게
    }
    // 개인전일 경우 기존 로직
    return isVisualReady ? 'border-primary bg-secondary/30' : 'border-border';
  };

  return (
    <div
      className={cn(
        'relative flex h-28 flex-col items-center justify-center rounded-xl border-2 bg-card pt-2 transition-all',
        getBorderClass(),
      )}
    >
      {/* 방장 표시 */}
      {participant.isHost && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2">
          <Crown className="h-4 w-4 text-yellow-500" />
        </div>
      )}

      <UserIcon
        src={participant.profileImg}
        nickname={participant.nickname}
        size={40}
        className="from-primary to-purple-500 text-white border-none"
      />

      {/* 닉네임 */}
      <span className="mt-1 text-xs font-medium text-foreground">{participant.nickname}</span>

      {/* 상태 표시 */}
      <span className={cn('mt-1 text-xs', isReady ? 'text-primary' : 'text-muted-foreground')}>
        {participant.isHost ? '방장' : isReady ? '준비 완료' : '준비 대기'}
      </span>
    </div>
  );
}
